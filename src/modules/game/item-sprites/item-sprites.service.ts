import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateItemSpriteDto } from './dto/create-item-sprite.dto';
import { UpdateItemSpriteDto } from './dto/update-item-sprite.dto';

@Injectable()
export class ItemSpritesService {
  constructor(private prisma: PrismaService) {}

  // CREATE
  async create(data: CreateItemSpriteDto) {
    // validar item
    const item = await this.prisma.item.findUnique({
      where: { id: data.itemId },
    });

    if (!item) throw new NotFoundException('Item not found');

    // validar animation
    const animation = await this.prisma.animation.findUnique({
      where: { id: data.animationId },
    });

    if (!animation) throw new NotFoundException('Animation not found');

    // evitar duplicados
    const exists = await this.prisma.itemSprite.findFirst({
      where: {
        itemId: data.itemId,
        animationId: data.animationId,
        direction: data.direction,
      },
    });

    if (exists) {
      throw new BadRequestException(
        'Sprite already exists for this item + animation + direction',
      );
    }

    return this.prisma.itemSprite.create({
      data,
      include: {
        item: true,
        animation: true,
      },
    });
  }

  // GET ALL (admin list)
  findAll() {
    return this.prisma.itemSprite.findMany({
      include: {
        item: true,
        animation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // GET BY ID (🔥 para editar en admin)
  async findOne(id: string) {
    const sprite = await this.prisma.itemSprite.findUnique({
      where: { id },
      include: {
        item: true,
        animation: true,
      },
    });

    if (!sprite) throw new NotFoundException('ItemSprite not found');

    return sprite;
  }

  // GET BY ITEM (🔥 para Phaser)
  findByItem(itemId: string) {
    return this.prisma.itemSprite.findMany({
      where: { itemId },
      include: {
        animation: true,
      },
    });
  }

  // GET BY ITEM + ANIMATION (🔥 ultra útil)
  async findByItemAndAnimation(itemId: string, animationId: string) {
    return this.prisma.itemSprite.findMany({
      where: {
        itemId,
        animationId,
      },
      include: {
        animation: true,
      },
    });
  }

  // UPDATE
  async update(id: string, data: UpdateItemSpriteDto) {
    const exists = await this.prisma.itemSprite.findUnique({
      where: { id },
    });

    if (!exists) throw new NotFoundException('ItemSprite not found');

    return this.prisma.itemSprite.update({
      where: { id },
      data,
      include: {
        item: true,
        animation: true,
      },
    });
  }

  // DELETE
  async remove(id: string) {
    const exists = await this.prisma.itemSprite.findUnique({
      where: { id },
    });

    if (!exists) throw new NotFoundException('ItemSprite not found');

    return this.prisma.itemSprite.delete({
      where: { id },
    });
  }
}
