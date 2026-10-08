import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

import { R2Storage } from '../storage/r2.storage';
import { UploadsService } from './uploads.service';

/**
 * Cableado de `UploadsService` con el storage.
 *
 * R2Storage se construye en un inicializador de campo y exige credenciales, así
 * que el spec las pone antes de instanciar el servicio y espía el `upload` del
 * prototipo. No se toca R2 de verdad en ningún test.
 */
describe('UploadsService', () => {
  let service: UploadsService;
  let upload: jest.SpyInstance;

  beforeAll(() => {
    process.env.R2_ACCOUNT_ID ||= 'test-account';
    process.env.R2_ACCESS_KEY_ID ||= 'test-key';
    process.env.R2_SECRET_ACCESS_KEY ||= 'test-secret';
    process.env.R2_BUCKET ||= 'test-bucket';
    process.env.R2_PUBLIC_URL ||= 'https://cdn.test';
  });

  beforeEach(() => {
    upload = jest
      .spyOn(R2Storage.prototype, 'upload')
      .mockImplementation(async (_buffer, path) => `https://cdn.test/${path}`);
    service = new UploadsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function pngFrame(width = 16, height = 16) {
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 200, g: 100, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  }

  async function frames(count: number) {
    const out: Buffer[] = [];
    for (let index = 0; index < count; index++) out.push(await pngFrame());
    return out;
  }

  describe('uploadFrameAtlas', () => {
    it('sube UN solo objeto y devuelve la metadata del atlas', async () => {
      // El punto del sistema: el juego pide una textura, no cinco archivos.
      const result = await service.uploadFrameAtlas({
        frames: await frames(5),
        framesCount: 5,
        directions: 1,
        itemId: 'item-tv',
        animationKey: 'turn_on',
      });

      expect(upload).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        frameWidth: 16,
        frameHeight: 16,
        cols: 5,
        rows: 1,
        framesCount: 5,
        directions: 1,
        directional: false,
      });
      expect(result.url).toContain('objects/item-tv/animations/turn_on/');
      // El buffer no se filtra en la respuesta del endpoint.
      expect('buffer' in result).toBe(false);
    });

    it('guarda un PNG con el content-type correcto', async () => {
      await service.uploadFrameAtlas({
        frames: await frames(2),
        framesCount: 2,
        directions: 1,
        itemId: 'item-tv',
        animationKey: 'idle',
      });

      const [buffer, path, mimetype] = upload.mock.calls[0];
      expect(mimetype).toBe('image/png');
      expect(path).toMatch(/^objects\/item-tv\/animations\/idle\/.*\.png$/);
      expect((await sharp(buffer as Buffer).metadata()).format).toBe('png');
    });

    it('sigue la convención de rutas del proyecto', async () => {
      // Mismo criterio que /admin/item-sprites (items/{itemId}/{anim}/…): un
      // nombre de archivo generado por subida, así que el objeto es inmutable y
      // el CDN nunca sirve una versión vieja.
      const first = await service.uploadFrameAtlas({
        frames: await frames(1),
        framesCount: 1,
        directions: 1,
        itemId: 'item-tv',
        animationKey: 'turn_on',
      });
      const second = await service.uploadFrameAtlas({
        frames: await frames(1),
        framesCount: 1,
        directions: 1,
        itemId: 'item-tv',
        animationKey: 'turn_on',
      });

      expect(first.url).not.toBe(second.url);
    });

    it('NO toca el storage cuando la validación falla', async () => {
      // Todas las validaciones corren antes del PUT, así que un envío inválido
      // no deja nada a medias: no hay nada que limpiar porque no se escribió.
      await expect(
        service.uploadFrameAtlas({
          frames: [Buffer.from('no soy un png')],
          framesCount: 1,
          directions: 1,
          itemId: 'item-tv',
          animationKey: 'turn_on',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(upload).not.toHaveBeenCalled();
    });

    it('si el PUT al storage falla, propaga el error y no devuelve URL', async () => {
      // La escritura es de un ÚNICO objeto, así que no existe un estado parcial
      // posible: o el atlas está subido o no está. Un fallo no deja basura que
      // haya que borrar, y sobre todo no devuelve una URL que no exista.
      upload.mockRejectedValueOnce(new Error('R2 unreachable'));

      await expect(
        service.uploadFrameAtlas({
          frames: await frames(3),
          framesCount: 3,
          directions: 1,
          itemId: 'item-tv',
          animationKey: 'turn_on',
        }),
      ).rejects.toThrow('R2 unreachable');

      expect(upload).toHaveBeenCalledTimes(1);
    });

    it('rechaza un itemId o animationKey que escaparía del prefijo de storage', async () => {
      for (const evil of ['../../etc', 'a/b', 'x..y']) {
        await expect(
          service.uploadFrameAtlas({
            frames: await frames(1),
            framesCount: 1,
            directions: 1,
            itemId: evil,
            animationKey: 'turn_on',
          }),
        ).rejects.toThrow(BadRequestException);
        expect(upload).not.toHaveBeenCalled();
      }
    });

    it('compone las filas de una animación direccional', async () => {
      const result = await service.uploadFrameAtlas({
        frames: await frames(8),
        framesCount: 2,
        directions: 4,
        itemId: 'item-door',
        animationKey: 'opening',
      });

      expect(result).toMatchObject({ cols: 2, rows: 4, directional: true });
      const meta = await sharp(upload.mock.calls[0][0] as Buffer).metadata();
      expect(meta.width).toBe(32);
      expect(meta.height).toBe(64);
    });
  });

  describe('upload() — el camino que ya existía, intacto', () => {
    /** Archivo tal como lo entrega multer. */
    async function multerFile(buffer: Buffer, originalname = 'sprite.png') {
      return { buffer, originalname, mimetype: 'image/png' } as Express.Multer.File;
    }

    it('sigue subiendo una imagen suelta a la carpeta indicada', async () => {
      const url = await service.upload(await multerFile(await pngFrame(64, 64)), 'badges');

      expect(upload).toHaveBeenCalledTimes(1);
      const [, path, mimetype] = upload.mock.calls[0];
      expect(path).toMatch(/^badges\/\d+-[a-z0-9]+\.png$/);
      expect(mimetype).toBe('image/png');
      expect(url).toContain('badges/');
    });

    it('sigue aceptando los formatos que aceptaba antes (jpeg / webp / gif)', async () => {
      // El endpoint de frames es más estricto (sólo PNG), pero eso NO puede
      // haber restringido el upload general que usa todo el admin.
      const jpeg = await sharp({
        create: { width: 32, height: 32, channels: 3, background: { r: 1, g: 2, b: 3 } },
      })
        .jpeg()
        .toBuffer();
      const webp = await sharp({
        create: { width: 32, height: 32, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 1 } },
      })
        .webp()
        .toBuffer();
      const gif = await sharp({
        create: { width: 32, height: 32, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 1 } },
      })
        .gif()
        .toBuffer();

      await expect(service.upload(await multerFile(jpeg, 'a.jpg'), 'items')).resolves.toContain(
        '.jpeg',
      );
      await expect(service.upload(await multerFile(webp, 'a.webp'), 'items')).resolves.toContain(
        '.webp',
      );
      await expect(service.upload(await multerFile(gif, 'a.gif'), 'items')).resolves.toContain(
        '.gif',
      );
    });

    it('sigue rechazando una carpeta insegura', async () => {
      await expect(
        service.upload(await multerFile(await pngFrame()), '../../etc'),
      ).rejects.toThrow('Invalid folder');
      expect(upload).not.toHaveBeenCalled();
    });

    it('sigue rechazando un archivo que no es imagen', async () => {
      await expect(
        service.upload(await multerFile(Buffer.from('texto')), 'items'),
      ).rejects.toThrow(BadRequestException);
      expect(upload).not.toHaveBeenCalled();
    });

    it('sigue derivando la extensión del CONTENIDO, no del nombre', async () => {
      // Un PNG subido como "foo.jpg" se guarda como .png.
      const url = await service.upload(
        await multerFile(await pngFrame(), 'disfrazado.jpg'),
        'items',
      );
      expect(url).toMatch(/\.png$/);
    });
  });
});
