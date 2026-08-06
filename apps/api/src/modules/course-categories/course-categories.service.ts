import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertCourseCategoryDto } from './dto/upsert-course-category.dto';

@Injectable()
export class CourseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.courseCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  create(dto: UpsertCourseCategoryDto) {
    return this.prisma.courseCategory.create({
      data: { slug: dto.slug, name: dto.name, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async update(id: string, dto: UpsertCourseCategoryDto) {
    const category = await this.prisma.courseCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return this.prisma.courseCategory.update({
      where: { id },
      data: { slug: dto.slug, name: dto.name, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async delete(id: string) {
    const category = await this.prisma.courseCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    await this.prisma.courseCategory.delete({ where: { id } });
    return { success: true };
  }
}
