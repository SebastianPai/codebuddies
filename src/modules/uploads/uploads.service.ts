import { BadRequestException, Injectable } from '@nestjs/common';
import { SpacesStorage } from '../storage/spaces.storage';
import {
  DetectedImage,
  detectImage,
  generateFileName,
} from '../utils/image.processor';

// Sólo letras, números, guiones y slash simple entre segmentos — bloquea "../" y rutas absolutas.
const SAFE_FOLDER = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/;

@Injectable()
export class UploadsService {
  private storage = new SpacesStorage();

  async upload(file: Express.Multer.File, folder: string) {
    if (!SAFE_FOLDER.test(folder)) {
      throw new BadRequestException('Invalid folder');
    }

    // El mimetype/extensión del cliente son solo una pista, no la verdad: se
    // valida el contenido real del archivo antes de subirlo, y el nombre y
    // el Content-Type que se guardan salen de lo detectado, no de lo que
    // mandó el cliente.
    let detected: DetectedImage;
    try {
      detected = await detectImage(file.buffer);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Archivo inválido',
      );
    }

    const filename = generateFileName(file.originalname, detected.format);
    const path = `${folder}/${filename}`;

    const url = await this.storage.upload(file.buffer, path, detected.mimetype);

    return url;
  }
}
