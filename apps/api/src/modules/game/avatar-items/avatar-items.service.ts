import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AvatarSlotType } from '@prisma/client';

@Injectable()
export class AvatarItemsService {
  constructor(private prisma: PrismaService) {}

  async create(itemId: string, slot: AvatarSlotType) {
    return this.prisma.avatarItemData.create({
      data: { itemId, slot },
      include: { item: true },
    });
  }

  async findAll() {
    return this.prisma.avatarItemData.findMany({ include: { item: true } });
  }

  async findOne(id: string) {
    const avatarItem = await this.prisma.avatarItemData.findUnique({
      where: { id },
      include: { item: true },
    });
    if (!avatarItem) throw new NotFoundException('Avatar item no encontrado');
    return avatarItem;
  }

  async update(id: string, data: { slot?: AvatarSlotType; itemId?: string }) {
    return this.prisma.avatarItemData.update({
      where: { id },
      data,
      include: { item: true },
    });
  }

  async remove(id: string) {
    return this.prisma.avatarItemData.delete({ where: { id } });
  }
}
