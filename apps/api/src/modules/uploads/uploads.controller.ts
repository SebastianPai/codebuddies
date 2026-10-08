import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Body,
  BadRequestException,
} from '@nestjs/common';

import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { WORLD_OBJECT_LIMITS as L } from '@codebuddies/world-objects';
import { UploadsService } from './uploads.service';
import { UploadFramesDto } from './dto/upload-frames.dto';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Tope de archivos por petición de frames: el peor caso legítimo es una
 * animación de 24 frames por las 4 direcciones. Lo impone multer antes de
 * bufferizar nada, así que un envío absurdo se corta en el borde y no llega a
 * la validación de imágenes.
 */
const MAX_FRAME_FILES = L.maxFramesPerAnimation * Math.max(...L.allowedDirections);

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
  ) {
    if (!file) {
      throw new BadRequestException('File required');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    if (!folder) {
      throw new BadRequestException('Folder required');
    }

    const url = await this.uploadsService.upload(file, folder);

    return { url };
  }

  /**
   * Frames sueltos de una animación -> UN atlas en R2 + metadata.
   *
   * Los frames viajan en el campo `files`, y su ORDEN es el orden de los
   * frames: multipart preserva el orden de los archivos de un mismo campo, y
   * multer los entrega igual. Para una animación direccional el orden es
   * DIRECCIÓN-MAYOR — los `framesCount` frames de NORTH, después los de EAST,
   * SOUTH y WEST. No se reordena por nombre de archivo a propósito: quien
   * arma la animación decide la secuencia, y adivinarla a partir de
   * "frame_01" sería adivinar.
   *
   * Devuelve la geometría del atlas más un fragmento de `WorldAnimation` listo
   * para usar; sólo faltan `key`, `fps` y `loop`, que son decisiones del
   * creador y no salen de la imagen.
   */
  @Post('frames')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FRAME_FILES, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE, files: MAX_FRAME_FILES },
    }),
  )
  async uploadFrames(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadFramesDto,
  ) {
    if (!files?.length) {
      throw new BadRequestException('Se requiere al menos un frame');
    }

    const atlas = await this.uploadsService.uploadFrameAtlas({
      frames: files.map((file) => file.buffer),
      framesCount: dto.framesCount,
      directions: dto.directions ?? 1,
      itemId: dto.itemId,
      animationKey: dto.animationKey,
    });

    return {
      ...atlas,
      // Listo para pegar en `behavior.animations[]`. `row`/`startCol` son 0
      // porque cada animación tiene su propio atlas (ver frame-atlas.ts).
      animation: {
        row: 0,
        startCol: 0,
        framesCount: atlas.framesCount,
        directional: atlas.directional,
        spriteSheetUrl: atlas.url,
      },
    };
  }
}
