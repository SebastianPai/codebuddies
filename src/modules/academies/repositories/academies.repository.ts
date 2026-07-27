import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AcademyFilters } from '../types/academy-query.types';

@Injectable()
export class AcademiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.AcademyCreateInput) {
    return this.prisma.academy.create({ data });
  }

  findAll(filters: AcademyFilters = {}) {
    return this.prisma.academy.findMany({
      where: {
        active: filters.active,
        type: filters.type,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.academy.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.academy.findUnique({ where: { slug } });
  }

  update(id: string, data: Prisma.AcademyUpdateInput) {
    return this.prisma.academy.update({
      where: { id },
      data,
    });
  }
}
