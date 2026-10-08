import path from "path";

/**
 * PNG reales generados en el momento para la QA de subida.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ NO HAY BINARIOS EN EL REPO
 *
 * Los frames se generan con sharp —la misma librería que compone el atlas en
 * el servidor— así que son PNG de verdad, con canal alfa de verdad, y pasan (o
 * no) exactamente las validaciones de la Fase 2: formato real, dimensiones
 * idénticas entre frames, mínimo de píxeles opacos. Guardarlos como binarios
 * sólo añadiría peso al repo y la tentación de que dejen de coincidir con lo
 * que el backend exige.
 *
 * Cada frame lleva un color distinto y una franja opaca en una posición
 * distinta: así, cuando la animación avanza en el navegador, el cambio de
 * frame se puede comprobar mirando el `background-position` del recuadro.
 */

// sharp vive en apps/api (es dependencia del servidor, no del monorepo raíz).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require(
  require.resolve("sharp", { paths: [path.join(__dirname, "..", "apps", "api")] }),
) as typeof import("sharp");

export type FramePayload = { name: string; mimeType: string; buffer: Buffer };

const PALETTE: Array<[number, number, number]> = [
  [230, 60, 60],
  [60, 200, 90],
  [70, 120, 240],
  [240, 200, 50],
  [200, 70, 220],
  [60, 220, 220],
];

/**
 * Un frame: fondo transparente, un bloque opaco de color y una franja que se
 * desplaza con el índice.
 */
async function makeFrame(
  index: number,
  width: number,
  height: number,
): Promise<Buffer> {
  const [r, g, b] = PALETTE[index % PALETTE.length];
  const stripeTop = Math.min(height - 4, 4 + index * 3);

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="${width - 4}" height="${height - 4}"
            fill="rgb(${r},${g},${b})" fill-opacity="1" />
      <rect x="0" y="${stripeTop}" width="${width}" height="3" fill="black" />
    </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Los archivos de UNA animación, EN ORDEN de reproducción.
 *
 * Una animación direccional necesita `count × directions` archivos: el atlas
 * tiene una fila por cara y el editor los reparte por filas en el orden en que
 * llegan (los primeros `count` son la cara 0, los siguientes la cara 1…). Por
 * eso `directions` no es opcional para el caso real: un televisor de 4 caras
 * con 5 frames son 20 PNG.
 *
 * Los nombres no llevan ceros a la izquierda a propósito (1, 2, …, 10, 11):
 * un `sort()` ingenuo pondría el 10 antes que el 2, así que la subida prueba
 * de verdad el orden natural que aplica el editor.
 */
export async function framesFor(
  animationKey: string,
  count: number,
  options: { directions?: number; size?: { width: number; height: number } } = {},
): Promise<FramePayload[]> {
  const directions = Math.max(1, options.directions ?? 1);
  const size = options.size ?? { width: 32, height: 48 };
  const total = count * directions;
  const frames: FramePayload[] = [];

  for (let index = 0; index < total; index += 1) {
    frames.push({
      name: `${animationKey}_${index + 1}.png`,
      mimeType: "image/png",
      buffer: await makeFrame(index, size.width, size.height),
    });
  }

  return frames;
}

/** Los mismos archivos en orden inverso, para comprobar que el editor los reordena. */
export async function shuffledFramesFor(
  animationKey: string,
  count: number,
  options: { directions?: number } = {},
): Promise<FramePayload[]> {
  const frames = await framesFor(animationKey, count, options);
  return [...frames].reverse();
}

/** Un PNG con dimensiones distintas: el backend tiene que rechazarlo. */
export async function mismatchedFrame(animationKey: string): Promise<FramePayload> {
  return {
    name: `${animationKey}_99.png`,
    mimeType: "image/png",
    buffer: await makeFrame(1, 17, 23),
  };
}

/** Un archivo que dice ser PNG y no lo es. */
export function fakePng(name = "roto.png"): FramePayload {
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.from("esto no es un PNG", "utf8"),
  };
}

/**
 * El sprite PRINCIPAL de un objeto (la imagen estática del item, la que exige
 * el editor para poder guardar): un PNG con alfa, no un frame de animación.
 */
export async function spritePng(
  name: string,
  size: { width: number; height: number } = { width: 64, height: 96 },
): Promise<FramePayload> {
  return { name, mimeType: "image/png", buffer: await makeFrame(2, size.width, size.height) };
}
