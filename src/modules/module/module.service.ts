import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';

@Injectable()
export class ModuleService {
  constructor(private prisma: PrismaService) {}

  async createModule(dto: CreateModuleDto) {
    if (!dto.translations?.length) {
      throw new Error(
        'Se requiere al menos una traducción para crear un módulo',
      );
    }

    return this.prisma.module.create({
      data: {
        translations: {
          create: dto.translations.map((t) => ({
            language: {
              connect: { code: t.languageCode },
            },
            title: t.title,
            description: t.description ?? null,
          })),
        },
      },
      include: {
        translations: {
          include: { language: true },
        },
      },
    });
  }

  async getAllModules(lang: string = 'es') {
    const modules = await this.prisma.module.findMany({
      include: {
        translations: {
          include: { language: true },
        },
        courses: {
          include: {
            translations: {
              include: { language: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return modules.map((mod) => {
      const translation =
        mod.translations.find((t) => t.language.code === lang) ||
        mod.translations.find((t) => t.language.code === 'es') ||
        mod.translations[0];

      return {
        id: mod.id,
        title: translation?.title ?? null,
        description: translation?.description ?? null,
        createdAt: mod.createdAt,

        courses: mod.courses.map((course) => {
          const courseTranslation =
            course.translations.find((t) => t.language.code === lang) ||
            course.translations.find((t) => t.language.code === 'es') ||
            course.translations[0];

          return {
            id: course.id,
            title: courseTranslation?.title ?? null,
            description: courseTranslation?.description ?? null,
            difficulty: course.difficulty,
            freeLimit: course.freeLimit,
            imageUrl: course.imageUrl,
          };
        }),
      };
    });
  }

  async getModuleById(id: string, lang: string = 'es') {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },
        courses: {
          include: {
            translations: { include: { language: true } },
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException('Módulo no encontrado');
    }

    const translation =
      module.translations.find((t) => t.language.code === lang) ||
      module.translations.find((t) => t.language.code === 'es') ||
      module.translations[0];

    return {
      id: module.id,
      title: translation?.title ?? null,
      description: translation?.description ?? null,
      createdAt: module.createdAt,
    };
  }

  async getModulesForAdmin() {
    const modules = await this.prisma.module.findMany({
      include: {
        translations: { include: { language: true } },
        courses: true, // ✅ ahora sí incluimos cursos
      },
      orderBy: { createdAt: 'asc' },
    });

    return modules.map((mod) => ({
      id: mod.id,
      createdAt: mod.createdAt,
      translations: mod.translations.map((t) => ({
        languageCode: t.language.code,
        title: t.title,
        description: t.description,
      })),
      coursesCount: mod.courses.length, // ✅ cantidad de cursos
    }));
  }

  async getModuleForAdmin(id: string) {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        translations: {
          include: { language: true },
        },
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    return {
      id: module.id,
      createdAt: module.createdAt,
      translations: module.translations.map((t) => ({
        languageCode: t.language.code,
        title: t.title,
        description: t.description,
      })),
    };
  }

  async updateModule(id: string, data: any) {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    if (data.translations) {
      for (const t of data.translations) {
        const language = await this.prisma.language.findUnique({
          where: { code: t.languageCode },
        });

        if (!language) continue;

        const existing = module.translations.find(
          (tr) => tr.languageId === language.id,
        );

        if (existing) {
          await this.prisma.moduleTranslation.update({
            where: { id: existing.id },
            data: {
              title: t.title,
              description: t.description,
            },
          });
        } else {
          await this.prisma.moduleTranslation.create({
            data: {
              moduleId: id,
              languageId: language.id,
              title: t.title,
              description: t.description,
            },
          });
        }
      }
    }

    return { success: true };
  }

  async deleteModule(id: string) {
    return this.prisma.module.delete({
      where: { id },
    });
  }
}
