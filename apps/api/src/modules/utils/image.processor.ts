import sharp from 'sharp';

// Claves = valores posibles de sharp's metadata().format para estos casos.
const ALLOWED_IMAGE_FORMATS: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export interface DetectedImage {
  format: string;
  mimetype: string;
}

// Antes se confiaba en el mimetype que manda el cliente (fácil de falsear) y
// la extensión se sacaba del nombre de archivo original, también controlado
// por el cliente — un .svg con script embebido, o cualquier archivo que no
// sea una imagen, podía subirse etiquetado como "image/png" y quedar servido
// tal cual desde el CDN. sharp decodifica los bytes reales del archivo (usa
// libvips, no puede engañarse con una extensión falsa) y solo lo acepta si
// es una de las 4 imágenes rasterizadas soportadas — SVG queda excluido a
// propósito por el riesgo de XSS almacenado.
export async function detectImage(buffer: Buffer): Promise<DetectedImage> {
  let format: string | undefined;

  try {
    const metadata = await sharp(buffer).metadata();
    format = metadata.format;
  } catch {
    throw new Error('El archivo no es una imagen válida');
  }

  const mimetype = format && ALLOWED_IMAGE_FORMATS[format];
  if (!mimetype) {
    throw new Error('Formato de imagen no soportado');
  }

  return { format, mimetype };
}

export function generateFileName(original: string, forcedExt?: string) {
  // La extensión real siempre se deriva del contenido detectado (forcedExt),
  // nunca del nombre de archivo del cliente — evita subir "foo.png" cuyo
  // contenido real sea otra cosa.
  const ext = forcedExt ?? original.split('.').pop();

  const random = Math.random().toString(36).slice(2, 8);

  return `${Date.now()}-${random}.${ext}`;
}

// ---- Compresión al subir ---------------------------------------------------
// Fotos/portadas (cursos, miniaturas de salas): se achican a 1920 px como
// máximo y se guardan en WebP, que pesa bastante menos que PNG/JPEG. Todo lo
// demás (sprites, atlas, fondos del juego, insignias, logos del tema) se
// optimiza SIN pérdida y sin cambiar dimensiones: el juego calcula frames y
// posiciones por píxel, redimensionarlos rompería las animaciones.
// GIF queda intacto (puede ser animado). Si el resultado no pesa menos que
// el original, se sube el original.
const PHOTO_FOLDERS = new Set(['courses', 'room-thumbnails']);
const PHOTO_MAX_SIDE = 1920;

export interface OptimizedImage {
  buffer: Buffer;
  format: string;
  mimetype: string;
}

export async function optimizeImage(
  buffer: Buffer,
  detected: DetectedImage,
  folder: string,
): Promise<OptimizedImage> {
  const original = { buffer, format: detected.format, mimetype: detected.mimetype };
  if (detected.format === 'gif') return original;

  const rootFolder = folder.split('/')[0];
  try {
    let candidate: OptimizedImage;
    if (PHOTO_FOLDERS.has(rootFolder)) {
      candidate = {
        buffer: await sharp(buffer)
          .rotate() // respeta la orientación EXIF de fotos de celular
          .resize({
            width: PHOTO_MAX_SIDE,
            height: PHOTO_MAX_SIDE,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 82, effort: 4 })
          .toBuffer(),
        format: 'webp',
        mimetype: 'image/webp',
      };
    } else if (detected.format === 'png') {
      candidate = {
        buffer: await sharp(buffer)
          .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 8 })
          .toBuffer(),
        format: 'png',
        mimetype: 'image/png',
      };
    } else if (detected.format === 'webp') {
      candidate = {
        buffer: await sharp(buffer).webp({ lossless: true, effort: 5 }).toBuffer(),
        format: 'webp',
        mimetype: 'image/webp',
      };
    } else {
      // JPEG fuera de las carpetas de fotos: recomprimirlo perdería
      // calidad; solo se sube tal cual.
      return original;
    }
    return candidate.buffer.length < buffer.length ? candidate : original;
  } catch {
    // Nunca bloquear una subida por la optimización.
    return original;
  }
}
