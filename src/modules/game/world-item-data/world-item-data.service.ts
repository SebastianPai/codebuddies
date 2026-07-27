import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

import { UpdateWorldItemDto } from './dto/update-world-item.dto';

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

    return this.prisma.worldItemData.update({
      where: {
        itemId,
      },
      data: dto,
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
