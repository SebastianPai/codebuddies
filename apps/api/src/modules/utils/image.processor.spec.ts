import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { detectImage, optimizeImage } from './image.processor';

// Imagen "foto" con ruido (no comprime trivialmente) para que el WebP gane.
async function noisyPng(width: number, height: number) {
  const raw = randomBytes(width * height * 3);
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

describe('optimizeImage', () => {
  it('convierte fotos de cursos a WebP y limita el tamaño a 1920 px', async () => {
    const input = await noisyPng(2600, 1300);
    const result = await optimizeImage(
      input,
      await detectImage(input),
      'courses',
    );
    expect(result.format).toBe('webp');
    expect(result.buffer.length).toBeLessThan(input.length);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(1920);
    expect(meta.height).toBe(960);
  });

  it('no cambia dimensiones ni formato de sprites del juego', async () => {
    const input = await sharp({
      create: {
        width: 256,
        height: 64,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png({ compressionLevel: 0 })
      .toBuffer();
    const result = await optimizeImage(
      input,
      await detectImage(input),
      'item-sprites',
    );
    expect(result.format).toBe('png');
    const meta = await sharp(result.buffer).metadata();
    expect([meta.width, meta.height]).toEqual([256, 64]);
    expect(result.buffer.length).toBeLessThanOrEqual(input.length);
  });

  it('deja los GIF intactos', async () => {
    const input = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#00ff00' },
    })
      .gif()
      .toBuffer();
    const result = await optimizeImage(
      input,
      await detectImage(input),
      'courses',
    );
    expect(result.buffer).toBe(input);
  });
});
