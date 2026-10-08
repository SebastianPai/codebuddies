import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { WORLD_OBJECT_LIMITS as L, animationCell } from '@codebuddies/world-objects';

import { buildFrameAtlas } from './frame-atlas';

/**
 * Validación de frames y composición del atlas.
 *
 * Los PNG se generan de verdad con sharp en cada test — nada de fixtures
 * binarios en el repo — y el atlas resultante se vuelve a decodificar para
 * comprobar qué quedó en cada celda. Así el test verifica la IMAGEN, no sólo
 * la metadata.
 */

/** Lienzo sólido y totalmente opaco. */
function solidPng(width: number, height: number, rgb: [number, number, number]) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: rgb[0], g: rgb[1], b: rgb[2], alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

/** Lienzo transparente con un bloque opaco de `blockW × blockH` en la esquina. */
async function pngWithOpaqueBlock(
  width: number,
  height: number,
  blockW: number,
  blockH: number,
) {
  const block = await sharp({
    create: {
      width: blockW,
      height: blockH,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: block, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

/** Lienzo 100 % transparente. */
function transparentPng(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();
}

/** RGBA de un píxel concreto del atlas. */
async function pixelAt(atlas: Buffer, x: number, y: number) {
  const raw = await sharp(atlas)
    .ensureAlpha()
    .extract({ left: x, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer();
  return { r: raw[0], g: raw[1], b: raw[2], a: raw[3] };
}

/** Colores distinguibles, uno por frame, para poder verificar el orden. */
const COLORS: Array<[number, number, number]> = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
  [255, 0, 255],
  [0, 255, 255],
  [128, 64, 32],
  [32, 64, 128],
];

async function colorFrames(count: number, size = 16) {
  const frames: Buffer[] = [];
  for (let index = 0; index < count; index++) {
    frames.push(await solidPng(size, size, COLORS[index % COLORS.length]));
  }
  return frames;
}

async function plainFrames(count: number, width = 16, height = 16) {
  const frames: Buffer[] = [];
  for (let index = 0; index < count; index++) {
    frames.push(await solidPng(width, height, [10, 20, 30]));
  }
  return frames;
}

describe('buildFrameAtlas — cantidad de frames', () => {
  it('1 frame produce un atlas de una sola celda', async () => {
    const result = await buildFrameAtlas({
      frames: await plainFrames(1, 32, 48),
      framesCount: 1,
      directions: 1,
    });

    expect(result).toMatchObject({
      frameWidth: 32,
      frameHeight: 48,
      cols: 1,
      rows: 1,
      framesCount: 1,
      directions: 1,
      directional: false,
    });

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(48);
    expect(meta.format).toBe('png');
  });

  it('5 frames producen un atlas de 5 columnas', async () => {
    const result = await buildFrameAtlas({
      frames: await plainFrames(5, 32, 32),
      framesCount: 5,
      directions: 1,
    });

    expect(result.cols).toBe(5);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(160);
    expect(meta.height).toBe(32);
  });

  it(`${L.maxFramesPerAnimation} frames (el máximo) se aceptan`, async () => {
    const result = await buildFrameAtlas({
      frames: await plainFrames(L.maxFramesPerAnimation, 16, 16),
      framesCount: L.maxFramesPerAnimation,
      directions: 1,
    });

    expect(result.cols).toBe(L.maxFramesPerAnimation);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(16 * L.maxFramesPerAnimation);
  }, 20000);

  it(`${L.maxFramesPerAnimation + 1} frames se rechazan`, async () => {
    await expect(
      buildFrameAtlas({
        frames: await plainFrames(L.maxFramesPerAnimation + 1, 16, 16),
        framesCount: L.maxFramesPerAnimation + 1,
        directions: 1,
      }),
    ).rejects.toThrow(
      new RegExp(`supera el máximo de ${L.maxFramesPerAnimation} frames`),
    );
  }, 20000);

  it('rechaza cuando la cantidad de archivos no cuadra con frames × direcciones', async () => {
    await expect(
      buildFrameAtlas({
        frames: await plainFrames(5),
        framesCount: 3,
        directions: 1,
      }),
    ).rejects.toThrow(/se esperaban 3 archivos/);
  });

  it('rechaza framesCount menor que 1', async () => {
    await expect(
      buildFrameAtlas({ frames: [], framesCount: 0, directions: 1 }),
    ).rejects.toThrow(/framesCount debe ser al menos 1/);
  });
});

describe('buildFrameAtlas — formato real del archivo', () => {
  it('acepta un PNG válido', async () => {
    const result = await buildFrameAtlas({
      frames: await plainFrames(1, 32, 32),
      framesCount: 1,
      directions: 1,
    });
    expect(result.bytes).toBeGreaterThan(0);
  });

  it('rechaza un archivo con extensión .png pero contenido inválido', async () => {
    // Lo que el cliente diga del archivo no importa: el formato se decide
    // decodificando los bytes.
    const fake = Buffer.from('Esto no es un PNG, es texto plano con nombre .png');

    await expect(
      buildFrameAtlas({ frames: [fake], framesCount: 1, directions: 1 }),
    ).rejects.toThrow(/no es una imagen válida/);
  });

  it('rechaza un PNG truncado / corrupto', async () => {
    const valid = await solidPng(32, 32, [1, 2, 3]);
    const corrupt = valid.subarray(0, Math.floor(valid.length / 2));

    await expect(
      buildFrameAtlas({ frames: [corrupt], framesCount: 1, directions: 1 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza un SVG aunque sea una imagen válida', async () => {
    // Excluido en todo el proyecto por riesgo de XSS almacenado, y además no
    // es un frame de pixel art.
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">' +
        '<rect width="32" height="32" fill="red"/><script>alert(1)</script></svg>',
    );

    await expect(
      buildFrameAtlas({ frames: [svg], framesCount: 1, directions: 1 }),
    ).rejects.toThrow(/debe ser PNG/);
  });

  it('rechaza un JPEG (no tiene canal alfa)', async () => {
    const jpeg = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .jpeg()
      .toBuffer();

    await expect(
      buildFrameAtlas({ frames: [jpeg], framesCount: 1, directions: 1 }),
    ).rejects.toThrow(/debe ser PNG/);
  });

  it('rechaza un GIF', async () => {
    const gif = await sharp({
      create: { width: 32, height: 32, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 1 } },
    })
      .gif()
      .toBuffer();

    await expect(
      buildFrameAtlas({ frames: [gif], framesCount: 1, directions: 1 }),
    ).rejects.toThrow(/debe ser PNG/);
  });
});

describe('buildFrameAtlas — dimensiones', () => {
  it('rechaza frames con dimensiones distintas', async () => {
    // Sin esto la rejilla no cierra y cada celda recortaría un trozo del frame
    // siguiente.
    const frames = [await solidPng(32, 32, [1, 1, 1]), await solidPng(32, 48, [2, 2, 2])];

    await expect(
      buildFrameAtlas({ frames, framesCount: 2, directions: 1 }),
    ).rejects.toThrow(/no coincide con 32×32 px del primer frame/);
  });

  it(`rechaza un lado menor que ${L.minFrameSize} px`, async () => {
    await expect(
      buildFrameAtlas({
        frames: [await solidPng(L.minFrameSize - 1, 32, [1, 1, 1])],
        framesCount: 1,
        directions: 1,
      }),
    ).rejects.toThrow(
      new RegExp(`menor que el mínimo de ${L.minFrameSize}×${L.minFrameSize}`),
    );
  });

  it(`rechaza un lado mayor que ${L.maxFrameSize} px`, async () => {
    await expect(
      buildFrameAtlas({
        frames: [await solidPng(L.maxFrameSize + 1, 32, [1, 1, 1])],
        framesCount: 1,
        directions: 1,
      }),
    ).rejects.toThrow(new RegExp(`supera el máximo de ${L.maxFrameSize}×${L.maxFrameSize}`));
  });

  it('acepta exactamente los límites de tamaño', async () => {
    await expect(
      buildFrameAtlas({
        frames: [await solidPng(L.minFrameSize, L.minFrameSize, [1, 1, 1])],
        framesCount: 1,
        directions: 1,
      }),
    ).resolves.toMatchObject({ frameWidth: L.minFrameSize });
  });

  it(`rechaza un atlas que pasaría de ${L.maxAtlasSize} px de lado`, async () => {
    // 9 frames de 512 px de ancho = 4608 px > 4096, aunque cada frame y la
    // cantidad de frames sean válidos por separado.
    const frames = await plainFrames(9, L.maxFrameSize, L.minFrameSize);

    await expect(
      buildFrameAtlas({ frames, framesCount: 9, directions: 1 }),
    ).rejects.toThrow(/el atlas resultante sería de 4608×16 px/);
  }, 20000);

  it('la ALTURA del atlas no puede pasarse: está acotada por los otros límites', async () => {
    // El peor caso de alto es 4 direcciones × 512 px = 2048, la mitad del tope
    // de 4096. O sea que el límite de atlas sólo se puede alcanzar por el
    // ANCHO (hasta 24 frames × 512 = 12288). Se deja fijado con un test para
    // que quede claro por qué, y para que salte si alguien sube maxFrameSize o
    // agrega direcciones sin revisar el tope del atlas.
    const worstCaseHeight = Math.max(...L.allowedDirections) * L.maxFrameSize;
    expect(worstCaseHeight).toBeLessThanOrEqual(L.maxAtlasSize);

    const frames = await plainFrames(4, 16, L.maxFrameSize);
    const result = await buildFrameAtlas({ frames, framesCount: 1, directions: 4 });

    const meta = await sharp(result.buffer).metadata();
    expect(meta.height).toBe(worstCaseHeight);
  }, 20000);
});

describe('buildFrameAtlas — transparencia', () => {
  it('rechaza un frame completamente transparente', async () => {
    // El área de clic del mueble es el alpha real del frame ACTUAL
    // (pixelPerfect), así que un frame vacío lo deja imposible de usar.
    await expect(
      buildFrameAtlas({
        frames: [await transparentPng(32, 32)],
        framesCount: 1,
        directions: 1,
      }),
    ).rejects.toThrow(/sólo tiene 0 píxel\(es\) visible\(s\)/);
  });

  it('rechaza un frame con menos píxeles opacos que el piso absoluto', async () => {
    // 3×3 = 9 px opacos, por debajo de 16.
    await expect(
      buildFrameAtlas({
        frames: [await pngWithOpaqueBlock(64, 64, 3, 3)],
        framesCount: 1,
        directions: 1,
      }),
    ).rejects.toThrow(new RegExp(`hacen falta al menos ${L.minOpaquePixels}`));
  });

  it('acepta exactamente el piso de píxeles opacos', async () => {
    // 4×4 = 16 px opacos.
    await expect(
      buildFrameAtlas({
        frames: [await pngWithOpaqueBlock(64, 64, 4, 4)],
        framesCount: 1,
        directions: 1,
      }),
    ).resolves.toBeDefined();
  });

  it('acepta arte disperso que un umbral del 1 % habría rechazado', async () => {
    // El caso que motivó usar un piso absoluto: una lámpara de 2×80 px en un
    // lienzo de 128×128 son 160 px opacos = 0,98 % del lienzo.
    const lamp = await pngWithOpaqueBlock(128, 128, 2, 80);

    await expect(
      buildFrameAtlas({ frames: [lamp], framesCount: 1, directions: 1 }),
    ).resolves.toBeDefined();
  });

  it('detecta el frame vacío señalando cuál es', async () => {
    const frames = [
      await solidPng(32, 32, [1, 1, 1]),
      await solidPng(32, 32, [2, 2, 2]),
      await transparentPng(32, 32),
    ];

    await expect(
      buildFrameAtlas({ frames, framesCount: 3, directions: 1 }),
    ).rejects.toThrow(/frame 3:/);
  });

  it('el atlas conserva el fondo transparente entre celdas', async () => {
    const lamp = await pngWithOpaqueBlock(32, 32, 8, 8);
    const result = await buildFrameAtlas({
      frames: [lamp, lamp],
      framesCount: 2,
      directions: 1,
    });

    // (20, 20) cae fuera del bloque opaco de la primera celda.
    expect((await pixelAt(result.buffer, 20, 20)).a).toBe(0);
  });
});

describe('buildFrameAtlas — direcciones', () => {
  it('animación NO direccional: una sola fila', async () => {
    const result = await buildFrameAtlas({
      frames: await colorFrames(4),
      framesCount: 4,
      directions: 1,
    });

    expect(result.rows).toBe(1);
    expect(result.directional).toBe(false);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.height).toBe(16);
  });

  it('animación direccional: una fila por dirección', async () => {
    const result = await buildFrameAtlas({
      frames: await plainFrames(12, 16, 16),
      framesCount: 3,
      directions: 4,
    });

    expect(result).toMatchObject({ cols: 3, rows: 4, directional: true, directions: 4 });
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(48);
    expect(meta.height).toBe(64);
  });

  it('`directional` se deriva de las filas y no puede contradecir a la imagen', async () => {
    const one = await buildFrameAtlas({
      frames: await plainFrames(2),
      framesCount: 2,
      directions: 1,
    });
    const four = await buildFrameAtlas({
      frames: await plainFrames(8),
      framesCount: 2,
      directions: 4,
    });

    expect(one.directional).toBe(false);
    expect(four.directional).toBe(true);
  });

  it('rechaza un número de direcciones que el juego no reconoce', async () => {
    // getFaceCount() en el juego sólo entiende 1, 2 y 4.
    for (const directions of [3, 5, 8, 0, -1]) {
      await expect(
        buildFrameAtlas({
          frames: await plainFrames(Math.max(1, directions)),
          framesCount: 1,
          directions,
        }),
      ).rejects.toThrow(/directions debe ser 1, 2, 4/);
    }
  });
});

describe('buildFrameAtlas — orden determinista de los frames', () => {
  it('la columna N del atlas es el archivo N', async () => {
    const frames = await colorFrames(4, 16);
    const result = await buildFrameAtlas({ frames, framesCount: 4, directions: 1 });

    for (let frame = 0; frame < 4; frame++) {
      // Centro de la celda del frame.
      const pixel = await pixelAt(result.buffer, frame * 16 + 8, 8);
      expect([pixel.r, pixel.g, pixel.b]).toEqual(COLORS[frame]);
    }
  });

  it('el orden es DIRECCIÓN-MAYOR: fila = dirección, columna = frame', async () => {
    // 2 frames × 4 direcciones = 8 archivos, cada uno de un color distinto.
    // files[d * framesCount + f] debe caer en (fila d, columna f).
    const frames = await colorFrames(8, 16);
    const result = await buildFrameAtlas({ frames, framesCount: 2, directions: 4 });

    for (let direction = 0; direction < 4; direction++) {
      for (let frame = 0; frame < 2; frame++) {
        const pixel = await pixelAt(result.buffer, frame * 16 + 8, direction * 16 + 8);
        expect([pixel.r, pixel.g, pixel.b]).toEqual(COLORS[direction * 2 + frame]);
      }
    }
  });

  it('coincide con animationCell() del contrato compartido', async () => {
    // La prueba de que el atlas y el motor hablan del mismo sistema de
    // coordenadas: se pide la celda con la MISMA función que usará el juego y
    // se comprueba que ahí está el color esperado.
    const frames = await colorFrames(6, 16);
    const result = await buildFrameAtlas({ frames, framesCount: 3, directions: 2 });

    const animation = {
      key: 'turn_on',
      row: 0,
      startCol: 0,
      framesCount: result.framesCount,
      fps: 12,
      loop: false,
      directional: result.directional,
      spriteSheetUrl: null,
    };

    for (let direction = 0; direction < 2; direction++) {
      for (let frame = 0; frame < 3; frame++) {
        const cell = animationCell(animation, frame, direction);
        const pixel = await pixelAt(
          result.buffer,
          cell.col * result.frameWidth + 8,
          cell.row * result.frameHeight + 8,
        );
        expect([pixel.r, pixel.g, pixel.b]).toEqual(COLORS[direction * 3 + frame]);
      }
    }
  });

  it('la misma entrada produce el mismo atlas byte a byte', async () => {
    const frames = await colorFrames(3, 16);

    const first = await buildFrameAtlas({ frames, framesCount: 3, directions: 1 });
    const second = await buildFrameAtlas({ frames, framesCount: 3, directions: 1 });

    expect(first.buffer.equals(second.buffer)).toBe(true);
  });
});

describe('buildFrameAtlas — metadata', () => {
  it('la metadata describe exactamente la imagen generada', async () => {
    const result = await buildFrameAtlas({
      frames: await plainFrames(8, 24, 40),
      framesCount: 2,
      directions: 4,
    });

    expect(result).toMatchObject({
      frameWidth: 24,
      frameHeight: 40,
      cols: 2,
      rows: 4,
      framesCount: 2,
      directions: 4,
      directional: true,
    });

    // Y la imagen de verdad coincide con lo que la metadata afirma.
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(result.cols * result.frameWidth);
    expect(meta.height).toBe(result.rows * result.frameHeight);
    expect(meta.format).toBe('png');
    expect(meta.hasAlpha).toBe(true);
    expect(result.bytes).toBe(result.buffer.byteLength);
  });

  it('el atlas cabe en el límite de peso', async () => {
    const result = await buildFrameAtlas({
      frames: await plainFrames(4, 64, 64),
      framesCount: 4,
      directions: 1,
    });
    expect(result.bytes).toBeLessThanOrEqual(L.maxAtlasBytes);
  });
});
