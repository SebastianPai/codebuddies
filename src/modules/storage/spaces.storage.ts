import { Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class SpacesStorage {
  private readonly logger = new Logger(SpacesStorage.name);
  private client: S3Client;

  constructor() {
    if (!process.env.SPACES_KEY || !process.env.SPACES_SECRET) {
      throw new Error('SPACES credentials missing in .env');
    }

    this.client = new S3Client({
      region: process.env.SPACES_REGION,
      endpoint: process.env.SPACES_ENDPOINT,
      credentials: {
        accessKeyId: process.env.SPACES_KEY,
        secretAccessKey: process.env.SPACES_SECRET,
      },
      forcePathStyle: false,
    });
  }

  async upload(buffer: Buffer, path: string, mimetype: string) {
    try {
      const command = new PutObjectCommand({
        Bucket: process.env.SPACES_BUCKET,
        Key: path,
        Body: buffer,
        ContentType: mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
        ACL: 'public-read',
      });

      await this.client.send(command);

      return `${process.env.CDN_URL}/${path}`;
    } catch (error) {
      this.logger.error(
        `Error subiendo a Spaces: ${path}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
