// Validación de frames sueltos y generación del ATLAS de una animación.
//
// ─────────────────────────────────────────────────────────────────────────
// QUÉ RESUELVE
//
// El creador diseña su animación en Aseprite/PixelLab/Krita y exporta PNGs
// sueltos (frame_01.png … frame_05.png). Si el juego tuviera que descargar
// esos archivos uno por uno, una sala con 20 objetos animados serían cientos
// de peticiones y cientos de texturas. Acá se componen en UN solo PNG, que es
// lo que el motor ya sabe recortar con `tex.add()` — el mismo camino que usan
// RoomItemsManager (caras de un mueble) y PetSystem (clips de mascota).
//
// Sin GIF en ninguna parte: PNG + metadata, y el motor controla fps/loop.
//
// ─────────────────────────────────────────────────────────────────────────
// DISPOSICIÓN — la del contrato, no una paralela
//
// Filas = direcciones · Columnas = frames. Es exactamente lo que espera
// `animationCell()` de @codebuddies/world-objects:
//
//     cell.row = animation.row + (directional ? direccion : 0)
//     cell.col = animation.startCol + frame
//
//   directions = 1 (no direccional)      directions = 4 (direccional)
//   ┌────┬────┬────┬────┐               ┌────┬────┬────┐
//   │ f0 │ f1 │ f2 │ f3 │               │ N0 │ N1 │ N2 │   fila 0
//   └────┴────┴────┴────┘               ├────┼────┼────┤
//                                       │ E0 │ E1 │ E2 │   fila 1
//                                       ├────┼────┼────┤
//                                       │ S0 │ S1 │ S2 │   fila 2
//                                       ├────┼────┼────┤
//                                       │ W0 │ W1 │ W2 │   fila 3
//                                       └────┴────┴────┘
//
// El orden de direcciones (NORTH, EAST, SOUTH, WEST) es el mismo que ya usan
// `getSpriteOffset()` y `directionFromRotation()`.
//
// Un atlas por ANIMACIÓN, así que `row` y `startCol` del WorldAnimation
// resultante son siempre 0 y el atlas va en su propio `spriteSheetUrl`. El
// contrato también admite varias animaciones compartiendo una hoja con
// offsets distintos; esa variante queda para arte hecho a mano, no la produce
// este generador.
//
// ─────────────────────────────────────────────────────────────────────────
// NO TOCA A LOS OBJETOS QUE YA EXISTEN
//
// El spritesheet de un item actual es una TIRA HORIZONTAL donde la columna es
// la dirección y no hay eje de frames. Este atlas es una rejilla distinta, y
// los dos conviven sin ambigüedad porque sólo se lee la rejilla cuando el
// objeto tiene `behavior`, y los items de siempre tienen `behavior = null`.
// Nada de este archivo entra en el camino de `POST /uploads`.

import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { WORLD_OBJECT_LIMITS as L } from '@codebuddies/world-objects';

/** Orden de las filas de un atlas direccional. */
export const ATLAS_DIRECTION_ORDER = [
  'NORTH',
  'EAST',
  'SOUTH',
  'WEST',
] as const;

/**
 * Cota de píxeles que sharp acepta DECODIFICAR de un archivo de entrada.
 *
 * Un PNG de pocos KB puede declarar 30.000×30.000 px en su cabecera y hacer
 * que la descompresión consuma gigas (decompression bomb). El límite de
 * 512×512 por frame se comprueba sobre la metadata, pero esta cota es la que
 * impide que la decodificación misma se desmadre antes de llegar ahí. Se deja
 * con holgura sobre maxFrameSize² para que el error sea el mensaje claro de
 * "dimensiones fuera de rango" y no un fallo opaco de sharp.
 */
const MAX_INPUT_PIXELS = 4 * L.maxFrameSize * L.maxFrameSize;

/** PNG y sólo PNG. Ver `assertPng` para el por qué. */
const ALLOWED_FRAME_FORMAT = 'png';

export type FrameAtlasInput = {
  /**
   * Frames en orden DIRECCIÓN-MAYOR: primero los `framesCount` frames de la
   * dirección 0, después los de la 1, etc. Índice = `direccion * framesCount
   * + frame`.
   */
  frames: Buffer[];
  /** Columnas del atlas: cuántos frames tiene la animación. */
  framesCount: number;
  /** Filas del atlas: 1 = no direccional. */
  directions: number;
};

export type FrameAtlasResult = {
  /** PNG del atlas, listo para subir. */
  buffer: Buffer;
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
  framesCount: number;
  directions: number;
  /**
   * Derivado de `rows > 1`, no un dato aparte: un atlas de una sola fila no
   * puede ser direccional y uno de varias filas necesariamente lo es. Así no
   * hay forma de que la metadata se contradiga con la imagen.
   */
  directional: boolean;
  bytes: number;
};

/** Metadata de un frame ya verificado. */
type FrameProbe = {
  width: number;
  height: number;
  opaquePixels: number;
};

function fail(message: string): never {
  throw new BadRequestException(message);
}

/**
 * Formato REAL del archivo, decodificando los bytes con sharp — el mimetype y
 * la extensión que manda el cliente son una pista, no la verdad. Mismo
 * criterio que `detectImage()` en utils/image.processor.ts, que es lo que ya
 * protege a `POST /uploads`.
 *
 * Sólo PNG, más estricto que el allowlist general de uploads
 * (png/jpeg/webp/gif), y a propósito:
 *   · JPEG no tiene canal alfa, y un frame sin transparencia pinta un
 *     rectángulo opaco sobre el suelo isométrico;
 *   · GIF es justamente lo que este sistema evita (el motor controla fps y
 *     loop, no el archivo);
 *   · WebP sí soporta alfa, pero agregaría un segundo camino de decodificación
 *     sin ninguna ventaja para pixel art.
 * SVG queda excluido como en todo el proyecto (riesgo de XSS almacenado).
 */
async function probeFrame(buffer: Buffer, index: number): Promise<FrameProbe> {
  const label = `frame ${index + 1}`;

  let image: sharp.Sharp;
  let metadata: sharp.Metadata;
  try {
    image = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS });
    metadata = await image.metadata();
  } catch {
    fail(`${label}: el archivo no es una imagen válida`);
  }

  if (metadata.format !== ALLOWED_FRAME_FORMAT) {
    fail(
      `${label}: debe ser PNG (se detectó "${metadata.format ?? 'desconocido'}"). ` +
        'Los frames necesitan canal alfa y PNG es el único formato aceptado.',
    );
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width < L.minFrameSize || height < L.minFrameSize) {
    fail(
      `${label}: ${width}×${height} px es menor que el mínimo de ` +
        `${L.minFrameSize}×${L.minFrameSize}`,
    );
  }
  if (width > L.maxFrameSize || height > L.maxFrameSize) {
    fail(
      `${label}: ${width}×${height} px supera el máximo de ` +
        `${L.maxFrameSize}×${L.maxFrameSize}`,
    );
  }

  // La decodificación va aparte del metadata: un PNG TRUNCADO tiene la
  // cabecera intacta (así que `metadata()` responde con dimensiones y formato
  // correctos) y sólo falla al leer los píxeles, con un error crudo de libvips
  // ("pngload_buffer: end of stream"). Sin este catch, un archivo a medias
  // salía por el filtro de excepciones como un 500 opaco en vez de un 400 que
  // le dice al creador qué archivo está roto.
  let opaquePixels: number;
  try {
    opaquePixels = await countOpaquePixels(buffer);
  } catch {
    fail(
      `${label}: el PNG está corrupto o incompleto y no se pudo decodificar`,
    );
  }

  return { width, height, opaquePixels };
}

/**
 * Píxeles cuyo alfa alcanza el umbral que usa el hit test del juego.
 *
 * Se lee SÓLO el canal alfa (1 byte por píxel en vez de 4) y de un frame a la
 * vez: con 24 frames × 4 direcciones a 512×512, leer RGBA de todos a la vez
 * serían ~100 MB de buffers vivos.
 */
async function countOpaquePixels(buffer: Buffer): Promise<number> {
  const alpha = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .ensureAlpha()
    .extractChannel('alpha')
    .raw()
    .toBuffer();

  let count = 0;
  for (let index = 0; index < alpha.length; index++) {
    if (alpha[index] >= L.opaqueAlphaThreshold) count++;
  }
  return count;
}

/**
 * Valida los frames y compone el atlas.
 *
 * El orden de las comprobaciones es de más barato a más caro (parámetros →
 * metadata → alfa → composición), para que un envío obviamente inválido no
 * pague la decodificación de 96 PNGs.
 */
export async function buildFrameAtlas(
  input: FrameAtlasInput,
): Promise<FrameAtlasResult> {
  const framesCount = Math.trunc(Number(input.framesCount));
  const directions = Math.trunc(Number(input.directions));

  // ── 1) parámetros ──
  if (!Number.isFinite(framesCount) || framesCount < 1) {
    fail('framesCount debe ser al menos 1');
  }
  if (framesCount > L.maxFramesPerAnimation) {
    fail(
      `framesCount ${framesCount} supera el máximo de ${L.maxFramesPerAnimation} frames`,
    );
  }
  if (!L.allowedDirections.includes(directions)) {
    fail(
      `directions debe ser ${L.allowedDirections.join(', ')} (llegó ${input.directions})`,
    );
  }

  const expected = framesCount * directions;
  if (input.frames.length !== expected) {
    fail(
      `se esperaban ${expected} archivos (${framesCount} frames × ${directions} ` +
        `direcciones) y llegaron ${input.frames.length}`,
    );
  }

  // ── 2) cada frame: formato real, dimensiones y alfa ──
  const probes: FrameProbe[] = [];
  for (let index = 0; index < input.frames.length; index++) {
    probes.push(await probeFrame(input.frames[index], index));
  }

  const { width: frameWidth, height: frameHeight } = probes[0];

  // Dimensiones idénticas: sin esto la rejilla no cierra y cada celda
  // recortaría un trozo distinto del frame siguiente.
  probes.forEach((probe, index) => {
    if (probe.width !== frameWidth || probe.height !== frameHeight) {
      fail(
        `frame ${index + 1}: ${probe.width}×${probe.height} px no coincide con ` +
          `${frameWidth}×${frameHeight} px del primer frame. Todos los frames de una ` +
          'animación deben tener exactamente el mismo tamaño.',
      );
    }
  });

  // Un frame sin píxeles clickeables deja el objeto imposible de usar: el área
  // de interacción es el alpha real del frame ACTUAL.
  probes.forEach((probe, index) => {
    if (probe.opaquePixels < L.minOpaquePixels) {
      fail(
        `frame ${index + 1}: sólo tiene ${probe.opaquePixels} píxel(es) visible(s) y hacen ` +
          `falta al menos ${L.minOpaquePixels}. Un frame vacío o casi vacío deja el objeto ` +
          'imposible de clickear dentro del juego.',
      );
    }
  });

  // ── 3) tamaño del atlas ──
  const cols = framesCount;
  const rows = directions;
  const atlasWidth = cols * frameWidth;
  const atlasHeight = rows * frameHeight;

  if (atlasWidth > L.maxAtlasSize || atlasHeight > L.maxAtlasSize) {
    fail(
      `el atlas resultante sería de ${atlasWidth}×${atlasHeight} px y el máximo es ` +
        `${L.maxAtlasSize}×${L.maxAtlasSize}. Reducí el tamaño del frame o la cantidad ` +
        'de frames.',
    );
  }

  // ── 4) composición ──
  const composites: sharp.OverlayOptions[] = [];
  for (let direction = 0; direction < rows; direction++) {
    for (let frame = 0; frame < cols; frame++) {
      composites.push({
        input: input.frames[direction * framesCount + frame],
        left: frame * frameWidth,
        top: direction * frameHeight,
      });
    }
  }

  const buffer = await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      // Fondo transparente: el hueco entre celdas nunca debe pintar nada.
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .composite(composites)
    // Sin paleta ni pérdida: es pixel art y el alfa decide el hit test.
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();

  if (buffer.byteLength > L.maxAtlasBytes) {
    fail(
      `el atlas pesa ${Math.round(buffer.byteLength / 1024)} KB y el máximo es ` +
        `${Math.round(L.maxAtlasBytes / 1024)} KB`,
    );
  }

  return {
    buffer,
    frameWidth,
    frameHeight,
    cols,
    rows,
    framesCount,
    directions,
    directional: rows > 1,
    bytes: buffer.byteLength,
  };
}
