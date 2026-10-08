import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import sharp from 'sharp';
import { WORLD_OBJECT_LIMITS as L } from '@codebuddies/world-objects';

import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { R2Storage } from '../storage/r2.storage';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';

/**
 * `POST /uploads/frames` a través del pipeline COMPLETO de Nest.
 *
 * Hasta ahora los frames se probaban a nivel de util (frame-atlas.spec) y de
 * servicio (uploads.service.spec). Esto cubre lo que sólo se rompe en el
 * borde: multer con varios archivos, el `ValidationPipe` global con
 * `forbidNonWhitelisted`, y la conversión de los campos multipart —que viajan
 * como TEXTO— a números. Es justo donde ya apareció un 400 silencioso en el
 * DTO de world-item-data.
 *
 * R2 se sustituye por un almacén en memoria que guarda los BYTES reales, así
 * que el atlas que se comprueba es el que se habría subido.
 */
describe('POST /uploads/frames', () => {
  let app: INestApplication;
  let server: unknown;
  const bucket = new Map<string, Buffer>();

  beforeAll(async () => {
    process.env.R2_ACCOUNT_ID ||= 'test';
    process.env.R2_ACCESS_KEY_ID ||= 'test';
    process.env.R2_SECRET_ACCESS_KEY ||= 'test';
    process.env.R2_BUCKET ||= 'test';
    process.env.R2_PUBLIC_URL ||= 'https://cdn.test';

    jest
      .spyOn(R2Storage.prototype, 'upload')
      .mockImplementation(async (buffer, path) => {
        bucket.set(path, buffer);
        return `${process.env.R2_PUBLIC_URL}/${path}`;
      });

    const moduleRef = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [UploadsService],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    // EXACTAMENTE la misma configuración que main.ts.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });

  beforeEach(() => bucket.clear());

  /** PNG sólido, NO cuadrado a propósito. */
  function frame(rgb: [number, number, number], width = 32, height = 48) {
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

  type UploadOptions = {
    frames: Buffer[];
    itemId?: string;
    animationKey?: string;
    framesCount?: number;
    directions?: number;
    extraField?: [string, string];
    fileField?: string;
  };

  async function upload(options: UploadOptions) {
    const directions = options.directions ?? 1;
    let req = request(server as never)
      .post('/uploads/frames')
      .field('itemId', options.itemId ?? 'item-tv')
      .field('animationKey', options.animationKey ?? 'turn_on')
      // Los campos multipart viajan como TEXTO: el DTO los convierte.
      .field('framesCount', String(options.framesCount ?? options.frames.length / directions))
      .field('directions', String(directions));

    if (options.extraField) req = req.field(...options.extraField);

    options.frames.forEach((buffer, index) => {
      req = req.attach(options.fileField ?? 'files', buffer, `frame_${index + 1}.png`);
    });

    return req;
  }

  /** RGB de un píxel del atlas realmente subido. */
  async function pixelOf(url: string, x: number, y: number) {
    const key = url.replace(`${process.env.R2_PUBLIC_URL}/`, '');
    const buffer = bucket.get(key)!;
    const raw = await sharp(buffer)
      .extract({ left: x, top: y, width: 1, height: 1 })
      .raw()
      .toBuffer();
    return [raw[0], raw[1], raw[2]];
  }

  // ─────────────────────────── camino feliz ───────────────────────────

  it('sube 5 frames y devuelve la metadata del atlas', async () => {
    const frames = await Promise.all(COLORS.slice(0, 5).map((rgb) => frame(rgb)));
    const response = await upload({ frames });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      frameWidth: 32,
      frameHeight: 48,
      cols: 5,
      rows: 1,
      framesCount: 5,
      directions: 1,
      directional: false,
    });
    expect(response.body.url).toContain('objects/item-tv/animations/turn_on/');
  });

  it('devuelve un fragmento de WorldAnimation listo para el editor', async () => {
    const frames = await Promise.all(COLORS.slice(0, 3).map((rgb) => frame(rgb)));
    const response = await upload({ frames });

    // Sólo faltan `key`, `fps` y `loop`, que son decisiones del creador.
    expect(response.body.animation).toEqual({
      row: 0,
      startCol: 0,
      framesCount: 3,
      directional: false,
      spriteSheetUrl: response.body.url,
    });
  });

  it('el orden de los archivos es el orden de los frames', async () => {
    const frames = await Promise.all(COLORS.slice(0, 5).map((rgb) => frame(rgb)));
    const response = await upload({ frames });

    for (let index = 0; index < 5; index++) {
      expect(await pixelOf(response.body.url, index * 32 + 16, 24)).toEqual(
        COLORS[index],
      );
    }
  });

  it('un solo frame produce un atlas de una celda', async () => {
    const response = await upload({ frames: [await frame(COLORS[0])] });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ cols: 1, rows: 1, framesCount: 1 });
  });

  it('conserva frames NO cuadrados', async () => {
    const frames = await Promise.all(
      COLORS.slice(0, 2).map((rgb) => frame(rgb, 17, 93)),
    );
    const response = await upload({ frames });

    expect(response.body).toMatchObject({ frameWidth: 17, frameHeight: 93 });
  });

  // ─────────────────────────── direccional ───────────────────────────

  it('una animación direccional produce una fila por cara', async () => {
    // 3 frames × 4 caras = 12 archivos, en orden DIRECCIÓN-MAYOR.
    const frames = await Promise.all(
      Array.from({ length: 12 }, (_unused, index) => frame(COLORS[index % 8])),
    );
    const response = await upload({ frames, framesCount: 3, directions: 4 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      cols: 3,
      rows: 4,
      directions: 4,
      directional: true,
    });
    expect(response.body.animation.directional).toBe(true);
  });

  it('coloca cada archivo en su (fila, columna)', async () => {
    const frames = await Promise.all(
      Array.from({ length: 8 }, (_unused, index) => frame(COLORS[index])),
    );
    const response = await upload({ frames, framesCount: 2, directions: 4 });

    // files[direccion * framesCount + frame] -> (fila direccion, columna frame)
    for (let direction = 0; direction < 4; direction++) {
      for (let column = 0; column < 2; column++) {
        expect(
          await pixelOf(response.body.url, column * 32 + 16, direction * 48 + 24),
        ).toEqual(COLORS[direction * 2 + column]);
      }
    }
  });

  it('rechaza un número de archivos que no cuadra con frames × caras', async () => {
    const frames = await Promise.all(COLORS.slice(0, 5).map((rgb) => frame(rgb)));
    const response = await upload({ frames, framesCount: 2, directions: 4 });

    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('se esperaban 8 archivos');
  });

  // ─────────────────────────── reemplazo ───────────────────────────

  it('volver a subir la misma animación genera un objeto NUEVO', async () => {
    // Nombre de archivo generado por subida: el CDN nunca sirve una versión
    // vieja. El atlas anterior queda huérfano (deuda técnica conocida).
    const frames = await Promise.all(COLORS.slice(0, 2).map((rgb) => frame(rgb)));

    const first = await upload({ frames });
    const second = await upload({ frames });

    expect(first.body.url).not.toBe(second.body.url);
    expect(bucket.size).toBe(2);
  });

  // ─────────────────────────── validación del borde ───────────────────────────

  it('sin archivos responde 400', async () => {
    const response = await request(server as never)
      .post('/uploads/frames')
      .field('itemId', 'item-tv')
      .field('animationKey', 'turn_on')
      .field('framesCount', '1')
      .field('directions', '1');

    expect(response.status).toBe(400);
  });

  it('rechaza una propiedad desconocida en el formulario', async () => {
    // whitelist + forbidNonWhitelisted del ValidationPipe global.
    const response = await upload({
      frames: [await frame(COLORS[0])],
      extraField: ['campoQueNoExiste', 'x'],
    });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.message)).toContain('campoQueNoExiste');
  });

  it('rechaza un itemId que intente escapar de su carpeta', async () => {
    const response = await upload({
      frames: [await frame(COLORS[0])],
      itemId: '../../etc',
    });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.message)).toContain('itemId');
    expect(bucket.size).toBe(0);
  });

  it('rechaza una animationKey con caracteres de ruta', async () => {
    const response = await upload({
      frames: [await frame(COLORS[0])],
      animationKey: 'a/b',
    });

    expect(response.status).toBe(400);
    expect(bucket.size).toBe(0);
  });

  it(`rechaza más de ${L.maxFramesPerAnimation} frames`, async () => {
    const frames = await Promise.all(
      Array.from({ length: L.maxFramesPerAnimation + 1 }, () => frame(COLORS[0], 16, 16)),
    );
    const response = await upload({ frames });

    expect(response.status).toBe(400);
  }, 30000);

  it('rechaza un archivo que no es una imagen', async () => {
    const response = await upload({ frames: [Buffer.from('no soy un png')] });

    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('imagen');
    expect(bucket.size).toBe(0);
  });

  it('rechaza frames de dimensiones distintas', async () => {
    const response = await upload({
      frames: [await frame(COLORS[0], 32, 48), await frame(COLORS[1], 32, 64)],
    });

    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('no coincide');
  });

  it('rechaza un frame totalmente transparente', async () => {
    const transparent = await sharp({
      create: {
        width: 32,
        height: 48,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    const response = await upload({ frames: [transparent] });

    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('visible');
  });

  it('rechaza un JPEG (sin canal alfa)', async () => {
    const jpeg = await sharp({
      create: { width: 32, height: 48, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .jpeg()
      .toBuffer();

    const response = await upload({ frames: [jpeg] });

    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('PNG');
  });

  it('no escribe nada en el storage cuando la validación falla', async () => {
    await upload({ frames: [Buffer.from('roto')] });
    expect(bucket.size).toBe(0);
  });

  // ─────────────────────── el upload de siempre, intacto ───────────────────────

  it('POST /uploads sigue funcionando como antes', async () => {
    const png = await frame(COLORS[0], 64, 64);
    const response = await request(server as never)
      .post('/uploads')
      .field('folder', 'badges')
      .attach('file', png, 'b.png');

    expect(response.status).toBe(201);
    expect(response.body.url).toContain('badges/');
  });
});
