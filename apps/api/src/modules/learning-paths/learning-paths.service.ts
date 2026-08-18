import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../admin/services/admin-audit.service';
import { CertificateEligibilityService } from '../certificates/services/certificate-eligibility.service';
import {
  SetPathCoursesDto,
  UpsertLearningPathDto,
} from './dto/upsert-learning-path.dto';

@Injectable()
export class LearningPathsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAuditService: AdminAuditService,
    private readonly certificateEligibilityService: CertificateEligibilityService,
  ) {}

  private pickTranslation(
    translations: Array<{
      title: string;
      description: string | null;
      language: { code: string };
    }>,
    lang: string,
  ) {
    return (
      translations.find((t) => t.language.code === lang) ||
      translations.find((t) => t.language.code === 'es') ||
      translations[0]
    );
  }

  private courseTitle(
    course: {
      translations: Array<{ title: string; language: { code: string } }>;
    },
    lang: string,
  ) {
    return (
      course.translations.find((t) => t.language.code === lang)?.title ||
      course.translations.find((t) => t.language.code === 'es')?.title ||
      course.translations[0]?.title ||
      null
    );
  }

  async listPublic(lang: string) {
    const paths = await this.prisma.learningPath.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        translations: { include: { language: true } },
        courses: {
          orderBy: { order: 'asc' },
          where: { course: { status: 'PUBLISHED' } },
          include: {
            course: {
              include: { translations: { include: { language: true } } },
            },
          },
        },
      },
    });

    return paths.map((path) => {
      const translation = this.pickTranslation(path.translations, lang);
      return {
        id: path.id,
        slug: path.slug,
        imageUrl: path.imageUrl,
        title: translation?.title ?? null,
        description: translation?.description ?? null,
        courseCount: path.courses.length,
        courses: path.courses.map((entry) => ({
          id: entry.course.id,
          order: entry.order,
          title: this.courseTitle(entry.course, lang),
        })),
      };
    });
  }

  // Sección 6/7 del pedido de producto: el mapa visual necesita, por cada
  // curso, si ya está completado, si está bloqueado (y por qué) y cuánto
  // se gana al completarlo — todo real, no decorativo. "Bloqueado" combina
  // dos señales que ya existían en el dominio pero nunca se cruzaban: el
  // orden secuencial dentro de la ruta (curso N requiere el N-1 de la
  // misma ruta) y los prerrequisitos explícitos del curso (CoursePrerequisite,
  // que pueden apuntar a cursos fuera de la ruta). Sin userId (visitante
  // anónimo), se muestra la estructura completa pero nada aparece
  // completado — el mapa sigue siendo honesto, no oculta el mecanismo.
  async getPublicBySlugOrId(slugOrId: string, lang: string, userId?: string) {
    const path = await this.prisma.learningPath.findFirst({
      where: { OR: [{ slug: slugOrId }, { id: slugOrId }], active: true },
      include: {
        translations: { include: { language: true } },
        courses: {
          orderBy: { order: 'asc' },
          where: { course: { status: 'PUBLISHED' } },
          include: {
            course: {
              include: {
                translations: { include: { language: true } },
                prerequisites: {
                  include: {
                    prerequisiteCourse: {
                      include: {
                        translations: { include: { language: true } },
                      },
                    },
                  },
                },
                lessons: {
                  where: { status: 'PUBLISHED' },
                  select: {
                    exercises: {
                      where: { status: 'PUBLISHED' },
                      select: { experience: true, coins: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!path) throw new NotFoundException('Learning path not found');

    const translation = this.pickTranslation(path.translations, lang);

    const completedByCourseId = new Map<string, boolean>();
    if (userId) {
      await Promise.all(
        path.courses.map(async (entry) => {
          completedByCourseId.set(
            entry.course.id,
            await this.certificateEligibilityService.isCourseCompleted(
              userId,
              entry.course.id,
            ),
          );
        }),
      );
    }

    let previousCourseCompleted = true;
    let previousCourseTitle: string | null = null;
    const courses = path.courses.map((entry) => {
      const exercises = entry.course.lessons.flatMap(
        (lesson) => lesson.exercises,
      );
      const xpReward = exercises.reduce(
        (sum, ex) => sum + (ex.experience || 0),
        0,
      );
      const coinsReward = exercises.reduce(
        (sum, ex) => sum + (ex.coins || 0),
        0,
      );

      const completed = completedByCourseId.get(entry.course.id) ?? false;

      const unmetPrerequisites = userId
        ? entry.course.prerequisites.filter(
            (p) => !completedByCourseId.get(p.prerequisiteCourseId),
          )
        : entry.course.prerequisites;

      const locked = !previousCourseCompleted || unmetPrerequisites.length > 0;

      const requires: string[] = [];
      if (!previousCourseCompleted && previousCourseTitle)
        requires.push(previousCourseTitle);
      requires.push(
        ...unmetPrerequisites.map(
          (p) => this.courseTitle(p.prerequisiteCourse, lang) ?? '',
        ),
      );

      previousCourseCompleted = completed;
      previousCourseTitle = this.courseTitle(entry.course, lang);

      return {
        id: entry.course.id,
        order: entry.order,
        title: this.courseTitle(entry.course, lang),
        difficulty: entry.course.difficulty,
        imageUrl: entry.course.imageUrl,
        xpReward,
        coinsReward,
        completed,
        locked,
        requires: [...new Set(requires.filter(Boolean))],
      };
    });

    const completedCount = courses.filter((c) => c.completed).length;

    return {
      id: path.id,
      slug: path.slug,
      imageUrl: path.imageUrl,
      title: translation?.title ?? null,
      description: translation?.description ?? null,
      progress: {
        completedCount,
        totalCount: courses.length,
        percent:
          courses.length > 0
            ? Math.round((completedCount / courses.length) * 100)
            : 0,
      },
      courses,
    };
  }

  listAdmin() {
    return this.prisma.learningPath.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        translations: { include: { language: true } },
        _count: { select: { courses: true } },
      },
    });
  }

  async getAdminById(id: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },
        courses: {
          orderBy: { order: 'asc' },
          include: {
            course: {
              include: { translations: { include: { language: true } } },
            },
          },
        },
      },
    });
    if (!path) throw new NotFoundException('Learning path not found');
    return {
      id: path.id,
      slug: path.slug,
      imageUrl: path.imageUrl,
      active: path.active,
      sortOrder: path.sortOrder,
      translations: path.translations.map((t) => ({
        languageCode: t.language.code,
        title: t.title,
        description: t.description,
      })),
      courses: path.courses.map((entry) => ({
        id: entry.course.id,
        order: entry.order,
        title: this.courseTitle(entry.course, 'es'),
      })),
    };
  }

  create(dto: UpsertLearningPathDto) {
    return this.prisma.learningPath.create({
      data: {
        slug: dto.slug,
        imageUrl: dto.imageUrl,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
        translations: {
          create: dto.translations.map((t) => ({
            language: { connect: { code: t.languageCode } },
            title: t.title,
            description: t.description,
          })),
        },
      },
    });
  }

  async update(id: string, dto: UpsertLearningPathDto) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!path) throw new NotFoundException('Learning path not found');

    await this.prisma.learningPath.update({
      where: { id },
      data: {
        slug: dto.slug,
        imageUrl: dto.imageUrl,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    for (const t of dto.translations) {
      const language = await this.prisma.language.findUnique({
        where: { code: t.languageCode },
      });
      if (!language) continue;

      const existing = path.translations.find(
        (tr) => tr.languageId === language.id,
      );

      if (existing) {
        await this.prisma.learningPathTranslation.update({
          where: { id: existing.id },
          data: { title: t.title, description: t.description },
        });
      } else {
        await this.prisma.learningPathTranslation.create({
          data: {
            learningPathId: id,
            languageId: language.id,
            title: t.title,
            description: t.description,
          },
        });
      }
    }

    return { success: true };
  }

  async delete(id: string, adminId?: string) {
    const path = await this.prisma.learningPath.delete({ where: { id } });
    if (adminId) {
      await this.adminAuditService.logStandalone({
        adminId,
        action: 'DELETE_LEARNING_PATH',
        targetType: 'LearningPath',
        targetId: id,
        metadata: { slug: path.slug },
      });
    }
    return { success: true };
  }

  async setCourses(id: string, dto: SetPathCoursesDto) {
    const path = await this.prisma.learningPath.findUnique({ where: { id } });
    if (!path) throw new NotFoundException('Learning path not found');

    await this.prisma.$transaction([
      this.prisma.learningPathCourse.deleteMany({
        where: { learningPathId: id },
      }),
      this.prisma.learningPathCourse.createMany({
        data: dto.courseIds.map((courseId, index) => ({
          learningPathId: id,
          courseId,
          order: index + 1,
        })),
      }),
    ]);

    return { success: true };
  }
}
