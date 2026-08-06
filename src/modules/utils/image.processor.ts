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
