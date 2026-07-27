import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { Difficulty } from '@prisma/client';

@Injectable()
export class CourseService {
  constructor(private prisma: PrismaService) {}

  async createCourse(dto: CreateCourseDto, imageUrl: string | undefined) {
    return this.prisma.course.create({
      data: {
        difficulty: dto.difficulty as Difficulty,
        freeLimit: dto.freeLimit,
        imageUrl,
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
      },
    });
  }

  async getAllCourses(lang: string) {
    const courses = await this.prisma.course.findMany({
      include: {
        translations: { include: { language: true } },

        module: {
          include: {
            translations: { include: { language: true } },
          },
        },

        lessons: {
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

        module: {
          id: course.module?.id,
          title: moduleTranslation?.title ?? null,
        },

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

  async getCourseById(id: string, lang: string) {
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
          orderBy: { order: 'asc' },
          include: {
            translations: { include: { language: true } },
            exercises: {
              orderBy: { order: 'asc' },
              include: { translations: { include: { language: true } } },
            },
          },
        },
      },
    });

    if (!course) {
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

      module: {
        id: course.module?.id,
        title: moduleTranslation?.title ?? null,
      },

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
            };
          }),
        };
      }),
    };
  }

  async deleteCourse(id: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId: id },
      select: { id: true },
    });

    const lessonIds = lessons.map((l) => l.id);

    await this.prisma.exercise.deleteMany({
      where: { lessonId: { in: lessonIds } },
    });

    await this.prisma.lesson.deleteMany({
      where: { courseId: id },
    });

    await this.prisma.courseTranslation.deleteMany({
      where: { courseId: id },
    });

    return this.prisma.course.delete({
      where: { id },
    });
  }

  async updateCourse(id: string, data: any) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.prisma.course.update({
      where: { id },
      data: {
        difficulty: data.difficulty,
        freeLimit: data.freeLimit,
        imageUrl: data.imageUrl,

        module: data.moduleId
          ? {
              connect: { id: data.moduleId },
            }
          : { disconnect: true },
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
      difficulty: course.difficulty,
      freeLimit: course.freeLimit,
      imageUrl: course.imageUrl,

      module: {
        id: course.module?.id,
        title: moduleTranslation?.title ?? null,
      },

      translations: course.translations.map((t) => ({
        languageCode: t.language.code,
        title: t.title,
        description: t.description,
      })),
    };
  }
}
