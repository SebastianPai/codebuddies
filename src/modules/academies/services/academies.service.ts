import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateAcademyDto } from '../dto/create-academy.dto';
import { UpdateAcademyDto } from '../dto/update-academy.dto';
import { AcademiesRepository } from '../repositories/academies.repository';
import { AcademyFilters } from '../types/academy-query.types';

@Injectable()
export class AcademiesService {
  constructor(private readonly academiesRepository: AcademiesRepository) {}

  create(dto: CreateAcademyDto) {
    return this.academiesRepository.create({
      name: dto.name,
      slug: dto.slug ?? this.toSlug(dto.name),
      type: dto.type,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      active: dto.active,
    });
  }

  findAll(filters?: AcademyFilters) {
    return this.academiesRepository.findAll(filters);
  }

  async findById(id: string) {
    const academy = await this.academiesRepository.findById(id);
    if (!academy) throw new NotFoundException('Academy not found');
    return academy;
  }

  async update(id: string, dto: UpdateAcademyDto) {
    await this.findById(id);
    return this.academiesRepository.update(id, {
      name: dto.name,
      slug: dto.slug,
      type: dto.type,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      active: dto.active,
    });
  }

  private toSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
