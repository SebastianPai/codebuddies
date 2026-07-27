import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { LessonType } from '@prisma/client';

@Injectable()
export class LessonService {
  constructor(private prisma: PrismaService) {}

  async createLesson(dto: CreateLessonDto) {
    return this.prisma.lesson.create({
      data: {
        course: {
          connect: { id: dto.courseId },
        },
        order: dto.order,
        type: dto.type || 'TEXT',

        translations: {
          create: dto.translations.map((t) => ({
            language: {
              connect: { code: t.languageCode },
            },
            title: t.title,
            description: t.description ?? null,
            content: t.content ?? null, // null está permitido en Json?
          })),
        },
      },

      include: {
        translations: {
          include: { language: true },
        },
        exercises: true, // opcional, pero útil
      },
    });
  }

  async getAdminLessons() {
    return this.prisma.lesson.findMany({
      include: {
        course: {
          include: {
            translations: {
              include: { language: true },
            },
            module: {
              include: {
                translations: {
                  include: { language: true },
                },
              },
            },
          },
        },
        translations: {
          include: { language: true },
        },
        exercises: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async getAdminLessonById(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        course: true,
        translations: {
          include: { language: true },
        },
        exercises: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }

    return lesson;
  }

  async getAllLessons(lang: string = 'es') {
    const lessons = await this.prisma.lesson.findMany({
      include: {
        translations: {
          include: { language: true },
        },
        course: true,
        exercises: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return lessons.map((lesson) => {
      const translation =
        lesson.translations.find((t) => t.language.code === lang) ||
        lesson.translations.find((t) => t.language.code === 'es') ||
        lesson.translations[0];

      return {
        id: lesson.id,
        courseId: lesson.courseId,
        order: lesson.order,
        type: lesson.type,
        title: translation?.title ?? null,
        description: translation?.description ?? null,
        content: translation?.content ?? null,
        course: lesson.course,
        exercises: lesson.exercises,
      };
    });
  }

  async getLessonsByCourse(courseId: string, lang: string = 'es') {
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: {
        translations: {
          include: { language: true },
        },
        exercises: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return lessons.map((lesson) => {
      const translation =
        lesson.translations.find((t) => t.language.code === lang) ||
        lesson.translations.find((t) => t.language.code === 'es') ||
        lesson.translations[0];

      return {
        id: lesson.id,
        courseId: lesson.courseId,
        order: lesson.order,
        type: lesson.type,
        title: translation?.title ?? null,
        description: translation?.description ?? null,
        content: translation?.content ?? null,
        exercises: lesson.exercises,
      };
    });
  }

  async getLessonById(id: string, lang: string = 'es') {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        translations: {
          include: { language: true },
        },
        course: true,
        exercises: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }

    const translation =
      lesson.translations.find((t) => t.language.code === lang) ||
      lesson.translations.find((t) => t.language.code === 'es') ||
      lesson.translations[0];

    return {
      id: lesson.id,
      courseId: lesson.courseId,
      order: lesson.order,
      type: lesson.type,
      title: translation?.title ?? null,
      description: translation?.description ?? null,
      content: translation?.content ?? null,
      course: lesson.course,
      exercises: lesson.exercises,
    };
  }

  async updateLesson(id: string, dto: any) {
    const { translations, ...lessonData } = dto;

    if (translations) {
      for (const t of translations) {
        const languageCode = t.language?.code || t.languageCode;

        await this.prisma.lessonTranslation.updateMany({
          where: {
            lessonId: id,
            language: {
              code: languageCode,
            },
          },
          data: {
            title: t.title,
            description: t.description ?? null,
            content: t.content ?? null,
          },
        });
      }
    }

    return this.prisma.lesson.update({
      where: { id },
      data: {
        order: lessonData.order,
        type: lessonData.type,
      },
      include: {
        translations: {
          include: { language: true },
        },
        exercises: true,
      },
    });
  }

  async deleteLesson(id: string) {
    return this.prisma.lesson.delete({
      where: { id },
    });
  }
}
