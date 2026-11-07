import { Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

export class R2Storage {
  private readonly logger = new Logger(R2Storage.name);
  private client: S3Client;

  constructor() {
    if (
      !process.env.R2_ACCOUNT_ID ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY
    ) {
      throw new Error('R2 credentials missing in .env');
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   * Uso de todo el bucket agrupado por la primera carpeta de la ruta
   * ("videos", "cursos", "items"...). Una pasada de ListObjectsV2 (1000
   * objetos por página): quien lo llame tiene que guardarlo un rato en caché.
   */
  async bucketUsage(): Promise<{
    totalBytes: number;
    objects: number;
    folders: { name: string; bytes: number; objects: number }[];
  }> {
    const byFolder = new Map<string, { bytes: number; objects: number }>();
    let totalBytes = 0;
    let objects = 0;
    let token: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: process.env.R2_BUCKET,
          ContinuationToken: token,
        }),
      );
      for (const object of page.Contents ?? []) {
        const size = object.Size ?? 0;
        const key = object.Key ?? '';
        const name = key.includes('/') ? key.slice(0, key.indexOf('/')) : '(raíz)';
        const entry = byFolder.get(name) ?? { bytes: 0, objects: 0 };
        entry.bytes += size;
        entry.objects += 1;
        byFolder.set(name, entry);
        totalBytes += size;
        objects += 1;
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    const folders = [...byFolder.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((x, y) => y.bytes - x.bytes);
    return { totalBytes, objects, folders };
  }

  /** Bytes guardados bajo un prefijo (p. ej. "videos/"), para no pasarse del plan. */
  async usedBytes(prefix: string): Promise<number> {
    let total = 0;
    let token: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: process.env.R2_BUCKET,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      );
      for (const object of page.Contents ?? []) total += object.Size ?? 0;
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return total;
  }

  async upload(buffer: Buffer, path: string, mimetype: string) {
    try {
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: path,
        Body: buffer,
        ContentType: mimetype,
        // R2 no soporta el parámetro ACL de S3 (devuelve NotImplemented) —
        // la visibilidad pública se configura a nivel de bucket/dominio en
        // el dashboard de Cloudflare, no por objeto.
        CacheControl: 'public, max-age=31536000, immutable',
      });

      await this.client.send(command);

      return `${process.env.R2_PUBLIC_URL}/${path}`;
    } catch (error) {
      this.logger.error(
        `Error subiendo a R2: ${path}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
