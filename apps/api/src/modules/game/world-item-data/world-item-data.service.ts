import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

import { UpdateWorldItemDto } from './dto/update-world-item.dto';
import { buildWorldEngineData } from '../items/engine-data.util';
import { clampSpriteOffset } from '../items/sprite-offset.util';

@Injectable()
export class WorldItemDataService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.worldItemData.findMany({
      include: {
        item: {
          include: {
            translations: {
              include: {
                language: true,
              },
            },
          },
        },
      },
      orderBy: {
        item: {
          createdAt: 'desc',
        },
      },
    });
  }

  async findOne(itemId: string) {
    const worldItem = await this.prisma.worldItemData.findUnique({
      where: {
        itemId,
      },
      include: {
        item: {
          include: {
            translations: {
              include: {
                language: true,
              },
            },
          },
        },
      },
    });

    if (!worldItem) {
      throw new NotFoundException(
        `WorldItemData no encontrado para item ${itemId}`,
      );
    }

    return worldItem;
  }

  async update(itemId: string, dto: UpdateWorldItemDto) {
    const exists = await this.prisma.worldItemData.findUnique({
      where: {
        itemId,
      },
    });

    if (!exists) {
      throw new NotFoundException(
        `WorldItemData no encontrado para item ${itemId}`,
      );
    }

    const data: Record<string, any> = { ...dto };

    // Nunca confiar en el valor crudo: el rango [-1000, 1000] y el "entero"
    // los garantiza el backend, no el form.
    if (dto.spriteOffsetX !== undefined) {
      data.spriteOffsetX = clampSpriteOffset(dto.spriteOffsetX);
    }
    if (dto.spriteOffsetY !== undefined) {
      data.spriteOffsetY = clampSpriteOffset(dto.spriteOffsetY);
    }

    // El juego nunca lee `frameWidth` crudo -- siempre lee
    // `worldData.engineData.frameWidth` (con fallback a width/4), así que
    // si cambia `directions` (1 cara vs 4) o las dimensiones, hay que
    // recalcular engineData acá también. Antes este endpoint (usado por
    // /admin/world-items, la config "avanzada" separada del alta inicial
    // del item) guardaba `directions` como columna suelta pero nunca tocaba
    // engineData, así que el toggle de "una sola cara" no tenía efecto
    // real en el juego si se cambiaba desde acá.
    if (
      dto.width !== undefined ||
      dto.height !== undefined ||
      dto.footprintWidth !== undefined ||
      dto.footprintHeight !== undefined ||
      dto.directions !== undefined
    ) {
      const optimized = buildWorldEngineData({
        width: dto.width ?? exists.width,
        height: dto.height ?? exists.height,
        footprintWidth: dto.footprintWidth ?? exists.footprintWidth,
        footprintHeight: dto.footprintHeight ?? exists.footprintHeight,
        footprints: exists.footprints,
        surfaces: exists.surfaces,
        faceCount: dto.directions ?? exists.directions ?? 4,
      });

      data.footprints = optimized.footprints;
      data.surfaces = optimized.surfaces;
      data.engineData = optimized.engineData;
    }

    return this.prisma.worldItemData.update({
      where: {
        itemId,
      },
      data,
      include: {
        item: {
          include: {
            translations: {
              include: {
                language: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(itemId: string) {
    const worldItem = await this.prisma.worldItemData.findUnique({
      where: {
        itemId,
      },
    });

    if (!worldItem) {
      throw new NotFoundException(`WorldItemData no encontrado`);
    }

    return this.prisma.worldItemData.delete({
      where: {
        itemId,
      },
    });
  }
}
