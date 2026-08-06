import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReorderDto } from '../../common/dto/reorder.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { PremiumAccessService } from '../premium-access/premium-access.service';

export interface LessonRequester {
  userId?: string;
  role?: Role;
}

@Injectable()
export class LessonService {
  constructor(
    private prisma: PrismaService,
    private readonly premiumAccessService: PremiumAccessService,
  ) {}

  async createLesson(dto: CreateLessonDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException(`Curso ${dto.courseId} no encontrado`);
    }

    return this.prisma.lesson.create({
      data: {
        course: {
          connect: { id: dto.courseId },
        },
        order: dto.order,
        type: dto.type || 'TEXT',
        status: dto.status,
        experience: dto.experience ?? 50,
        coins: dto.coins ?? 10,

        translations: {
          create: dto.translations.map((t) => ({
            language: {
              connect: { code: t.languageCode },
            },
            title: t.title,
            description: t.description ?? null,
            content: (t.content as Prisma.InputJsonValue) ?? undefined, // null está permitido en Json?
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
    // Sin guard de auth en esta ruta (GET /lessons es 100% pública): siempre
    // filtra a publicado, sin excepción para admins — para vista de admin
    // usar GET /lessons/admin, que sí trae todo sin filtrar.
    const lessons = await this.prisma.lesson.findMany({
      where: { status: 'PUBLISHED', course: { status: 'PUBLISHED' } },
      include: {
        translations: {
          include: { language: true },
        },
        course: true,
        exercises: {
          where: { status: 'PUBLISHED' },
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

  async getLessonsByCourse(
    courseId: string,
    lang: string = 'es',
    requester: LessonRequester = {},
  ) {
    const isAdmin = requester.role === Role.ADMIN;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { freeLimit: true },
    });
    if (!course) throw new NotFoundException('Curso no encontrado');

    const lessons = await this.prisma.lesson.findMany({
      where: isAdmin ? { courseId } : { courseId, status: 'PUBLISHED' },
      orderBy: { order: 'asc' },
      include: {
        translations: {
          include: { language: true },
        },
        exercises: {
          where: isAdmin ? undefined : { status: 'PUBLISHED' },
          orderBy: { order: 'asc' },
        },
      },
    });

    return lessons.map((lesson) => {
      const translation =
        lesson.translations.find((t) => t.language.code === lang) ||
        lesson.translations.find((t) => t.language.code === 'es') ||
        lesson.translations[0];

      const locked = false;

      return {
        id: lesson.id,
        courseId: lesson.courseId,
        order: lesson.order,
        type: lesson.type,
        title: translation?.title ?? null,
        description: translation?.description ?? null,
        content: locked ? null : (translation?.content ?? null),
        locked,
        exercises: lesson.exercises,
      };
    });
  }

  async getLessonById(
    id: string,
    lang: string = 'es',
    requester: LessonRequester = {},
  ) {
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

    if (!lesson || (lesson.status !== 'PUBLISHED' && requester.role !== Role.ADMIN)) {
      throw new NotFoundException('Lección no encontrada');
    }

    const translation =
      lesson.translations.find((t) => t.language.code === lang) ||
      lesson.translations.find((t) => t.language.code === 'es') ||
      lesson.translations[0];

    const locked = await this.premiumAccessService.isLessonLocked({
      courseId: lesson.courseId,
      lessonOrder: lesson.order,
      freeLimit: lesson.course.freeLimit,
      userId: requester.userId,
      role: requester.role,
    });

    return {
      id: lesson.id,
      courseId: lesson.courseId,
      order: lesson.order,
      type: lesson.type,
      title: translation?.title ?? null,
      description: translation?.description ?? null,
      // El contenido de lectura solo viaja si no está bloqueada — evita que
      // alguien la lea pegándole directo a este endpoint sin haber pasado
      // por el gating de la vista de curso.
      content: locked ? null : (translation?.content ?? null),
      locked,
      course: lesson.course,
      exercises: lesson.exercises,
    };
  }

  async updateLesson(id: string, dto: UpdateLessonDto) {
    const { translations, ...lessonData } = dto;

    if (translations) {
      for (const t of translations) {
        await this.prisma.lessonTranslation.updateMany({
          where: {
            lessonId: id,
            language: {
              code: t.languageCode,
            },
          },
          data: {
            title: t.title,
            description: t.description ?? null,
            content: (t.content as Prisma.InputJsonValue) ?? undefined,
          },
        });
      }
    }

    return this.prisma.lesson.update({
      where: { id },
      data: {
        order: lessonData.order,
        type: lessonData.type,
        status: lessonData.status,
        experience: lessonData.experience,
        coins: lessonData.coins,
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

  // Sin constraint único en (courseId, order) — no hace falta un "swap" de
  // dos pasos para evitar colisiones, un update en paralelo por fila alcanza.
  async reorderLessons(dto: ReorderDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.lesson.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );
    return { success: true };
  }
}
