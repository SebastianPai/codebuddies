import { Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
