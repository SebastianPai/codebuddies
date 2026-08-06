import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Difficulty, Role } from '@prisma/client';
import { PremiumAccessService } from '../premium-access/premium-access.service';
import { AdminAuditService } from '../admin/services/admin-audit.service';

export interface CourseRequester {
  userId?: string;
  role?: Role;
}

@Injectable()
export class CourseService {
  constructor(
    private prisma: PrismaService,
    private readonly premiumAccessService: PremiumAccessService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async createCourse(dto: CreateCourseDto, imageUrl: string | undefined) {
    const course = await this.prisma.course.create({
      data: {
        difficulty: dto.difficulty as Difficulty,
        freeLimit: dto.freeLimit,
        imageUrl,
        status: dto.status,
        module: dto.moduleId
          ? {
              connect: { id: dto.moduleId },
            }
          : undefined,
        translations: {
          create: dto.translations.map((t) => ({
            language: {
              connect: { code: t.languageCode },
            },
            title: t.title,
            description: t.description,
          })),
        },
        categories: dto.categoryIds?.length
          ? { connect: dto.categoryIds.map((id) => ({ id })) }
          : undefined,
      },
    });

    if (dto.prerequisiteCourseIds?.length) {
      await this.setPrerequisites(course.id, dto.prerequisiteCourseIds);
    }

    return course;
  }

  // Reemplaza el set completo de prerrequisitos de un curso (NF2). Ignora
  // silenciosamente un id que se apunte a sí mismo — evitar un curso que se
  // requiere a sí mismo no amerita rechazar todo el guardado.
  private async setPrerequisites(courseId: string, prerequisiteCourseIds: string[]) {
    const cleanIds = [...new Set(prerequisiteCourseIds)].filter((id) => id !== courseId);
    await this.prisma.$transaction([
      this.prisma.coursePrerequisite.deleteMany({ where: { courseId } }),
      this.prisma.coursePrerequisite.createMany({
        data: cleanIds.map((prerequisiteCourseId) => ({
          courseId,
          prerequisiteCourseId,
        })),
      }),
    ]);
  }

  async getAllCourses(
    lang: string,
    requester: CourseRequester = {},
    filters: { search?: string; categoryId?: string } = {},
  ) {
    const isAdmin = requester.role === Role.ADMIN;

    // NF7: búsqueda server-side real, antes 100% client-side sobre lo ya
    // cargado — ahora filtra en la consulta contra título/descripción de
    // CUALQUIER traducción (no solo la del idioma activo), para no esconder
    // cursos que sí matchean en otro idioma cargado.
    const searchClause = filters.search?.trim()
      ? {
          translations: {
            some: {
              OR: [
                { title: { contains: filters.search.trim(), mode: 'insensitive' as const } },
                { description: { contains: filters.search.trim(), mode: 'insensitive' as const } },
              ],
            },
          },
        }
      : {};

    const categoryClause = filters.categoryId
      ? { categories: { some: { id: filters.categoryId } } }
      : {};

    const courses = await this.prisma.course.findMany({
      // Los borradores/archivados solo son visibles para admins (vista
      // previa antes de publicar); el catálogo público nunca los muestra.
      where: {
        ...(isAdmin ? {} : { status: 'PUBLISHED' as const }),
        ...searchClause,
        ...categoryClause,
      },
      include: {
        translations: { include: { language: true } },

        module: {
          include: {
            translations: { include: { language: true } },
          },
        },

        categories: true,

        lessons: {
          where: isAdmin ? undefined : { status: 'PUBLISHED' },
          orderBy: { order: 'asc' },
          include: {
            translations: { include: { language: true } },
            exercises: true,
          },
        },
      },
    });

    return courses.map((course) => {
      const translation =
        course.translations.find((t) => t.language.code === lang) ||
        course.translations.find((t) => t.language.code === 'es') ||
        course.translations[0];

      const moduleTranslation =
        course.module?.translations?.find((t) => t.language.code === lang) ||
        course.module?.translations?.[0];

      const allExercises = course.lessons.flatMap((l) => l.exercises);

      const xpTotal = allExercises.reduce(
        (sum, ex) => sum + (ex.experience || 0),
        0,
      );

      const coinsTotal = allExercises.reduce(
        (sum, ex) => sum + (ex.coins || 0),
        0,
      );

      return {
        id: course.id,
        title: translation?.title ?? null,
        description: translation?.description ?? null,
        difficulty: course.difficulty,
        freeLimit: course.freeLimit,
        imageUrl: course.imageUrl,
        status: course.status,

        module: {
          id: course.module?.id,
          title: moduleTranslation?.title ?? null,
        },

        categories: course.categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),

        xpTotal,
        coinsTotal,

        lessons: course.lessons.map((lesson) => {
          const lessonTranslation =
            lesson.translations.find((t) => t.language.code === lang) ||
            lesson.translations.find((t) => t.language.code === 'es') ||
            lesson.translations[0];

          return {
            id: lesson.id,
            order: lesson.order,
            type: lesson.type,
            title: lessonTranslation?.title ?? null,
            description: lessonTranslation?.description ?? null,
          };
        }),
      };
    });
  }

  async getCourseById(
    id: string,
    lang: string,
    requester: CourseRequester = {},
  ) {
    const isAdmin = requester.role === Role.ADMIN;

    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },

        module: {
          include: {
            translations: { include: { language: true } },
          },
        },

        lessons: {
          where: isAdmin ? undefined : { status: 'PUBLISHED' },
          orderBy: { order: 'asc' },
          include: {
            translations: { include: { language: true } },
            exercises: {
              where: isAdmin ? undefined : { status: 'PUBLISHED' },
              orderBy: { order: 'asc' },
              include: { translations: { include: { language: true } } },
            },
          },
        },

        prerequisites: {
          include: {
            prerequisiteCourse: {
              include: { translations: { include: { language: true } } },
            },
          },
        },

        categories: true,
      },
    });

    // Un borrador/archivado es 404 para cualquiera que no sea admin, aunque
    // conozca el id directo — no solo se oculta del listado.
    if (!course || (course.status !== 'PUBLISHED' && !isAdmin)) {
      throw new NotFoundException('Course not found');
    }

    const translation =
      course.translations.find((t) => t.language.code === lang) ||
      course.translations.find((t) => t.language.code === 'es') ||
      course.translations[0];

    const moduleTranslation =
      course.module?.translations?.find((t) => t.language.code === lang) ||
      course.module?.translations?.[0];

    const allExercises = course.lessons.flatMap((l) => l.exercises);

    const xpTotal = allExercises.reduce(
      (sum, ex) => sum + (ex.experience || 0),
      0,
    );

    const coinsTotal = allExercises.reduce(
      (sum, ex) => sum + (ex.coins || 0),
      0,
    );

    return {
      id: course.id,
      title: translation?.title ?? null,
      description: translation?.description ?? null,
      difficulty: course.difficulty,
      freeLimit: course.freeLimit,
      imageUrl: course.imageUrl,
      status: course.status,

      module: {
        id: course.module?.id,
        title: moduleTranslation?.title ?? null,
      },

      // NF2: informativo — se muestra antes de inscribirse, no bloquea.
      prerequisites: course.prerequisites.map((p) => {
        const prereqTranslation =
          p.prerequisiteCourse.translations.find((t) => t.language.code === lang) ||
          p.prerequisiteCourse.translations.find((t) => t.language.code === 'es') ||
          p.prerequisiteCourse.translations[0];
        return { id: p.prerequisiteCourse.id, title: prereqTranslation?.title ?? null };
      }),

      categories: course.categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),

      xpTotal,
      coinsTotal,

      lessons: course.lessons.map((lesson) => {
        const lessonTranslation =
          lesson.translations.find((t) => t.language.code === lang) ||
          lesson.translations.find((t) => t.language.code === 'es') ||
          lesson.translations[0];

        // El contenido de los cursos es gratis para todos (ver
        // PremiumAccessService#isLessonLocked) — se mantiene el campo
        // `locked` en la respuesta (siempre false hoy) para no romper el
        // contrato con el frontend, y por si el gating se reactiva más
        // adelante.
        const locked = false;

        return {
          id: lesson.id,
          order: lesson.order,
          type: lesson.type,
          title: lessonTranslation?.title ?? null,
          description: lessonTranslation?.description ?? null,
          locked,

          exercises: lesson.exercises.map((ex) => {
            const exTranslation =
              ex.translations.find((t) => t.language.code === lang) ||
              ex.translations.find((t) => t.language.code === 'es') ||
              ex.translations[0];

            return {
              id: ex.id,
              title: exTranslation?.title ?? null,
              description: exTranslation?.description ?? null,
              order: ex.order,
              experience: ex.experience,
              coins: ex.coins,
              type: ex.type,
              locked,
            };
          }),
        };
      }),
    };
  }

  async deleteCourse(id: string, adminId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const courseTranslation = await tx.courseTranslation.findFirst({
        where: { courseId: id },
        select: { title: true },
      });

      const lessons = await tx.lesson.findMany({
        where: { courseId: id },
        select: { id: true },
      });

      const lessonIds = lessons.map((l) => l.id);

      await tx.exercise.deleteMany({
        where: { lessonId: { in: lessonIds } },
      });

      await tx.lesson.deleteMany({
        where: { courseId: id },
      });

      await tx.courseTranslation.deleteMany({
        where: { courseId: id },
      });

      const deleted = await tx.course.delete({
        where: { id },
      });

      if (adminId) {
        await this.adminAuditService.log(tx, {
          adminId,
          action: 'DELETE_COURSE',
          targetType: 'Course',
          targetId: id,
          metadata: { title: courseTranslation?.title ?? null },
        });
      }

      return deleted;
    });
  }

  async updateCourse(id: string, data: UpdateCourseDto, adminId?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (adminId && data.status && data.status !== course.status) {
      await this.prisma.adminActionLog.create({
        data: {
          adminId,
          action: 'CHANGE_COURSE_STATUS',
          targetType: 'Course',
          targetId: id,
          metadata: { from: course.status, to: data.status },
        },
      });
    }

    await this.prisma.course.update({
      where: { id },
      data: {
        difficulty: data.difficulty,
        freeLimit: data.freeLimit,
        imageUrl: data.imageUrl,
        status: data.status,

        module: data.moduleId
          ? {
              connect: { id: data.moduleId },
            }
          : { disconnect: true },
        categories: data.categoryIds
          ? { set: data.categoryIds.map((id) => ({ id })) }
          : undefined,
      },
    });

    if (data.translations) {
      for (const t of data.translations) {
        const language = await this.prisma.language.findUnique({
          where: { code: t.languageCode },
        });

        if (!language) continue;

        const existing = course.translations.find(
          (tr) => tr.languageId === language.id,
        );

        if (existing) {
          await this.prisma.courseTranslation.update({
            where: { id: existing.id },
            data: {
              title: t.title,
              description: t.description,
            },
          });
        } else {
          await this.prisma.courseTranslation.create({
            data: {
              courseId: id,
              languageId: language.id,
              title: t.title,
              description: t.description,
            },
          });
        }
      }
    }

    if (data.prerequisiteCourseIds) {
      await this.setPrerequisites(id, data.prerequisiteCourseIds);
    }

    return { success: true };
  }

  async getCourseForAdmin(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },
        module: {
          include: {
            translations: { include: { language: true } },
          },
        },
        prerequisites: {
          include: {
            prerequisiteCourse: {
              include: { translations: { include: { language: true } } },
            },
          },
        },
        categories: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const moduleTranslation =
      course.module?.translations?.find((t) => t.language.code === 'es') ||
      course.module?.translations?.[0];

    return {
      id: course.id,
      moduleId: course.moduleId,
      difficulty: course.difficulty,
      freeLimit: course.freeLimit,
      imageUrl: course.imageUrl,
      status: course.status,

      module: {
        id: course.module?.id,
        title: moduleTranslation?.title ?? null,
      },

      translations: course.translations.map((t) => ({
        languageCode: t.language.code,
        title: t.title,
        description: t.description,
      })),

      prerequisites: course.prerequisites.map((p) => ({
        id: p.prerequisiteCourse.id,
        title:
          p.prerequisiteCourse.translations.find((t) => t.language.code === 'es')?.title ??
          p.prerequisiteCourse.translations[0]?.title ??
          null,
      })),

      categoryIds: course.categories.map((c) => c.id),
    };
  }
}
