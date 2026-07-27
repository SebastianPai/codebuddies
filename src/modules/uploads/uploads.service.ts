import { BadRequestException, Injectable } from '@nestjs/common';
import { SpacesStorage } from '../storage/spaces.storage';
import { generateFileName } from '../utils/image.processor';

// Sólo letras, números, guiones y slash simple entre segmentos — bloquea "../" y rutas absolutas.
const SAFE_FOLDER = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/;

@Injectable()
export class UploadsService {
  private storage = new SpacesStorage();

  async upload(file: Express.Multer.File, folder: string) {
    if (!SAFE_FOLDER.test(folder)) {
      throw new BadRequestException('Invalid folder');
    }

    const filename = generateFileName(file.originalname);
    const path = `${folder}/${filename}`;

    const url = await this.storage.upload(file.buffer, path, file.mimetype);

    return url;
  }
}
