import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAnimationDto } from './dto/create-animation.dto';
import { UpdateAnimationDto } from './dto/update-animation.dto';
import { AnimationType } from '@prisma/client';

@Injectable()
export class AnimationsService {
  constructor(private prisma: PrismaService) {}

  // CREATE
  async create(data: CreateAnimationDto) {
    const exists = await this.prisma.animation.findUnique({
      where: {
        type_variant: {
          type: data.type,
          variant: data.variant,
        },
      },
    });

    if (exists) {
      throw new Error('Animation with this type and variant already exists');
    }

    return this.prisma.animation.create({ data });
  }

  // GET ALL
  findAll() {
    return this.prisma.animation.findMany({
      orderBy: [{ type: 'asc' }, { variant: 'asc' }],
    });
  }

  async getVariants(type: AnimationType) {
    const animations = await this.prisma.animation.findMany({
      where: { type },
      select: { variant: true },
    });

    return animations.map((a) => a.variant);
  }

  // GET BY TYPE (🔥 clave para frontend)
  findByType(type: AnimationType) {
    return this.prisma.animation.findMany({
      where: { type },
    });
  }

  // GET ONE
  async findOne(id: string) {
    const anim = await this.prisma.animation.findUnique({
      where: { id },
    });

    if (!anim) throw new NotFoundException('Animation not found');
    return anim;
  }

  // UPDATE
  async update(id: string, data: UpdateAnimationDto) {
    const exists = await this.prisma.animation.findUnique({
      where: { id },
    });

    if (!exists) throw new NotFoundException('Animation not found');

    return this.prisma.animation.update({
      where: { id },
      data,
    });
  }

  // DELETE
  async remove(id: string) {
    const exists = await this.prisma.animation.findUnique({
      where: { id },
    });

    if (!exists) throw new NotFoundException('Animation not found');

    return this.prisma.animation.delete({
      where: { id },
    });
  }
}
