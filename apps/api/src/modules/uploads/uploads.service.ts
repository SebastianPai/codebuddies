import { BadRequestException, Injectable } from '@nestjs/common';
import { R2Storage } from '../storage/r2.storage';
import {
  DetectedImage,
  detectImage,
  generateFileName,
  optimizeImage,
} from '../utils/image.processor';
import { buildFrameAtlas, type FrameAtlasResult } from './frame-atlas';

// Sólo letras, números, guiones y slash simple entre segmentos — bloquea "../" y rutas absolutas.
const SAFE_FOLDER = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/;

/**
 * UN solo segmento de ruta: como SAFE_FOLDER pero SIN barras.
 *
 * Hace falta aparte porque SAFE_FOLDER acepta la barra como separador, así que
 * una pieza que se interpola dentro de una ruta (`objects/{itemId}/…`) pasaría
 * la validación de la ruta completa aunque traiga `a/b` y meta segmentos que
 * nadie pidió. No se puede escapar de `objects/` de ninguna forma (el punto no
 * está en el alfabeto), pero un identificador no es una ruta y no debería
 * poder comportarse como una.
 */
const SAFE_SEGMENT = /^[a-zA-Z0-9_-]{1,64}$/;

export type FrameAtlasUpload = Omit<FrameAtlasResult, 'buffer'> & {
  url: string;
};

@Injectable()
export class UploadsService {
  private storage = new R2Storage();

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

    const optimized = await optimizeImage(file.buffer, detected, folder);
    const filename = generateFileName(file.originalname, optimized.format);
    const path = `${folder}/${filename}`;

    const url = await this.storage.upload(
      optimized.buffer,
      path,
      optimized.mimetype,
    );

    return url;
  }

  /**
   * Compone los frames de UNA animación en un atlas y lo sube a R2.
   *
   * Todas las validaciones (formato real, dimensiones idénticas, rango de
   * tamaño, alfa clickeable, límites, tamaño del atlas) corren ANTES de tocar
   * el storage: si algo está mal, no se sube nada y no hay nada que limpiar.
   *
   * La escritura es de un único objeto, así que no existe un estado a medias
   * posible. Si el PUT falla, el error sube tal cual y no se devuelve URL —
   * exactamente igual que en `upload()`.
   *
   * La ruta sigue la convención del proyecto (ver /admin/item-sprites, que usa
   * `items/{itemId}/{anim}/{variant}/{dir}`) y el nombre de archivo sale de
   * `generateFileName()`, así que cada subida es un objeto nuevo e inmutable y
   * el CDN nunca sirve una versión vieja.
   */
  async uploadFrameAtlas(input: {
    frames: Buffer[];
    framesCount: number;
    directions: number;
    itemId: string;
    animationKey: string;
  }): Promise<FrameAtlasUpload> {
    // Cada pieza se valida como segmento suelto, no sólo la ruta ya armada: el
    // controlador ya restringe ambos campos en el DTO, pero este servicio se
    // puede llamar desde cualquier parte y no debe confiar en eso.
    if (!SAFE_SEGMENT.test(input.itemId)) {
      throw new BadRequestException('itemId inválido');
    }
    if (!SAFE_SEGMENT.test(input.animationKey)) {
      throw new BadRequestException('animationKey inválida');
    }

    const folder = `objects/${input.itemId}/animations/${input.animationKey}`;
    if (!SAFE_FOLDER.test(folder)) {
      throw new BadRequestException('Invalid folder');
    }

    const atlas = await buildFrameAtlas({
      frames: input.frames,
      framesCount: input.framesCount,
      directions: input.directions,
    });

    const path = `${folder}/${generateFileName('atlas.png', 'png')}`;
    const url = await this.storage.upload(atlas.buffer, path, 'image/png');

    // El buffer del PNG no viaja en la respuesta: el cliente sólo necesita la
    // url y la geometría del atlas.
    return {
      url,
      frameWidth: atlas.frameWidth,
      frameHeight: atlas.frameHeight,
      cols: atlas.cols,
      rows: atlas.rows,
      framesCount: atlas.framesCount,
      directions: atlas.directions,
      directional: atlas.directional,
      bytes: atlas.bytes,
    };
  }
}
