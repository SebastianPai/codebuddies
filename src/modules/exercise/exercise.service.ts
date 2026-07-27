// apps/api/src/modules/exercise/exercise.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { ExerciseType, Prisma } from '@prisma/client';
import {
  Exercise,
  BaseExercise,
  CodingExercise,
  LiveExercise,
  QuizExercise,
  QuizQuestion,
} from './types/exercise.interface';

type AdminExercisePayload = Prisma.ExerciseGetPayload<{
  include: {
    translations: { include: { language: true } };
    lesson: {
      include: {
        translations: { include: { language: true } };
        course: {
          include: {
            translations: { include: { language: true } };
          };
        };
      };
    };
  };
}>;

@Injectable()
export class ExerciseService {
  constructor(private prisma: PrismaService) {}

  // Crear ejercicio
  async createExercise(dto: CreateExerciseDto) {
    let order = dto.order;
    if (!order) {
      const maxOrder = await this.prisma.exercise.aggregate({
        where: { lessonId: dto.lessonId },
        _max: { order: true },
      });
      order = (maxOrder._max.order || 0) + 1;
    }

    return this.prisma.exercise.create({
      data: {
        lesson: { connect: { id: dto.lessonId } },
        type: dto.type,
        codes: dto.codes,
        experience: dto.experience ?? 10,
        coins: dto.coins ?? 5,
        order,
        translations: {
          create: dto.translations.map((t) => ({
            language: { connect: { code: t.languageCode } },
            title: t.title,
            description: t.description,
            content: t.content || null,
          })),
        },
      },
      include: {
        translations: { include: { language: true } },
      },
    });
  }

  // Obtener ejercicios por lección con estado "completed" y tipado
  async getExercisesByLesson(
    lessonId: string,
    userId?: string,
    lang: string = 'es',
  ): Promise<Exercise[]> {
    const exercises = await this.prisma.exercise.findMany({
      where: { lessonId },
      orderBy: { order: 'asc' },
      include: { translations: { include: { language: true } } },
    });

    // Traer los completados por este usuario
    let completedIds: string[] = [];
    if (userId) {
      const completions = await this.prisma.completion.findMany({
        where: { userId, lessonId },
        select: { exerciseId: true },
      });
      completedIds = completions
        .map((c) => c.exerciseId)
        .filter(Boolean) as string[];
    }

    return exercises.map((ex) => {
      const translation =
        ex.translations.find((t) => t.language.code === lang) ||
        ex.translations.find((t) => t.language.code === 'es') ||
        ex.translations[0];

      const base: BaseExercise = {
        id: ex.id,
        lessonId: ex.lessonId,
        order: ex.order,
        title: translation?.title ?? null,
        description: translation?.description ?? null,
        experience: completedIds.includes(ex.id) ? ex.experience : 0,
        coins: completedIds.includes(ex.id) ? ex.coins : 0,
        completed: completedIds.includes(ex.id),
      };

      switch (ex.type) {
        case ExerciseType.CODE:
          const code: CodingExercise = {
            ...base,
            type: 'CODE',
            starterCode: ex.codes?.[0]?.initialCode ?? '',
            solutionCode: ex.codes?.[0]?.expectedCode ?? '',
            language: ex.codes?.[0]?.language ?? 'js',
          };
          return code;

        case ExerciseType.QUIZ: {
          const rawContent = translation?.content || ex.content || {};

          let quizBlocks: any[] = [];

          // Formato nuevo
          if (Array.isArray((rawContent as any)?.questions)) {
            quizBlocks = (rawContent as any).questions;
          }
          // Compatibilidad formato viejo
          else {
            const instructionElements =
              (rawContent as any)?.instructionElements || [];

            quizBlocks = instructionElements
              .filter((el: any) => el.type === 'quiz')
              .flatMap((el: any) => el.value || []);
          }

          const questions: QuizQuestion[] = quizBlocks.map(
            (q: any, index: number) => ({
              id: `${ex.id}-q${index}`, // ID único por pregunta
              question: q.question || 'Pregunta sin texto',
              options: q.options || [],
              correct: Array.isArray(q.correct) ? q.correct : [],
              isMultiple: q.isMultiple ?? false,
              explanation: q.explanation || '',
            }),
          );

          const quiz: QuizExercise = {
            ...base,
            type: 'QUIZ',
            questions,
          };
          return quiz;
        }

        case ExerciseType.LIVE:
          const live: LiveExercise = {
            ...base,
            type: 'LIVE',
            schedule: ex.codes?.[0]?.schedule ?? '',
            link: ex.codes?.[0]?.link ?? '',
          };
          return live;

        default:
          return {
            ...base,
            type: 'CODE',
            starterCode: '',
            solutionCode: '',
            language: 'js',
          } as CodingExercise;
      }
    });
  }

  // Obtener ejercicio individual
  async getExerciseById(
    id: string,
    userId?: string,
    lang: string = 'es',
  ): Promise<Exercise> {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },
      },
    });

    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');

    let completed = false;
    if (userId) {
      const completion = await this.prisma.completion.findFirst({
        where: { userId, exerciseId: id },
      });
      completed = !!completion;
    }

    const translation =
      exercise.translations.find((t) => t.language.code === lang) ||
      exercise.translations.find((t) => t.language.code === 'es') ||
      exercise.translations[0];

    const base: BaseExercise = {
      id: exercise.id,
      lessonId: exercise.lessonId,
      order: exercise.order,
      title: translation?.title ?? null,
      description: translation?.description ?? null,
      experience: completed ? exercise.experience : 0,
      coins: completed ? exercise.coins : 0,
      completed,
    };

    switch (exercise.type) {
      case ExerciseType.QUIZ: {
        const rawContent = translation?.content || exercise.content || {};
        let quizBlocks: any[] = [];

        if (Array.isArray((rawContent as any)?.questions)) {
          quizBlocks = (rawContent as any).questions;
        } else {
          const instructionElements =
            (rawContent as any)?.instructionElements || [];

          quizBlocks = instructionElements
            .filter((el: any) => el.type === 'quiz')
            .flatMap((el: any) => el.value || []);
        }

        const questions: QuizQuestion[] = quizBlocks.map(
          (q: any, index: number) => ({
            id: `${exercise.id}-q${index}`,
            question: q.question || 'Pregunta sin texto',
            options: q.options || [],
            correct: Array.isArray(q.correct) ? q.correct : [],
            isMultiple: q.isMultiple ?? false,
            explanation: q.explanation || '',
          }),
        );

        const quiz: QuizExercise = {
          ...base,
          type: 'QUIZ',
          questions,
        };
        return quiz;
      }

      case ExerciseType.CODE:
        return {
          ...base,
          type: 'CODE',
          starterCode: exercise.codes?.[0]?.initialCode ?? '',
          solutionCode: exercise.codes?.[0]?.expectedCode ?? '',
          language: exercise.codes?.[0]?.language ?? 'js',
          translations: exercise.translations, // ← ¡ESTA LÍNEA FALTABA!
        } as CodingExercise & { translations: any[] };

      case ExerciseType.LIVE:
        return {
          ...base,
          type: 'LIVE',
          schedule: exercise.codes?.[0]?.schedule ?? '',
          link: exercise.codes?.[0]?.link ?? '',
        } as LiveExercise;

      default:
        return {
          ...base,
          type: 'CODE',
          starterCode: '',
          solutionCode: '',
          language: 'js',
        } as CodingExercise;
    }
  }

  // Update y delete (sin cambios)
  async updateExercise(id: string, dto: any) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!exercise) {
      throw new NotFoundException('Ejercicio no encontrado');
    }

    await this.prisma.exercise.update({
      where: { id },
      data: {
        experience: dto.experience,
        coins: dto.coins,
        order: dto.order,
        codes: dto.codes,
      },
    });

    if (dto.translations) {
      for (const t of dto.translations) {
        const language = await this.prisma.language.findUnique({
          where: { code: t.languageCode },
        });

        if (!language) continue;

        const existing = exercise.translations.find(
          (tr) => tr.languageId === language.id,
        );

        if (existing) {
          await this.prisma.exerciseTranslation.update({
            where: { id: existing.id },
            data: {
              title: t.title,
              description: t.description,
              content: t.content,
            },
          });
        } else {
          await this.prisma.exerciseTranslation.create({
            data: {
              exerciseId: id,
              languageId: language.id,
              title: t.title,
              description: t.description,
              content: t.content,
            },
          });
        }
      }
    }

    return { success: true };
  }

  async deleteExercise(id: string) {
    await this.prisma.exerciseTranslation.deleteMany({
      where: { exerciseId: id },
    });

    return this.prisma.exercise.delete({
      where: { id },
    });
  }

  async getAdminExercises(lang: string = 'es') {
    const exercises: AdminExercisePayload[] =
      await this.prisma.exercise.findMany({
        orderBy: { order: 'asc' },
        include: {
          translations: { include: { language: true } },

          lesson: {
            include: {
              translations: { include: { language: true } },

              course: {
                include: {
                  translations: { include: { language: true } },
                },
              },
            },
          },
        },
      });

    return exercises.map((ex) => {
      const translation =
        ex.translations.find((t) => t.language.code === lang) ||
        ex.translations.find((t) => t.language.code === 'es') ||
        ex.translations[0];

      const lessonTranslation =
        ex.lesson.translations.find((t) => t.language.code === lang) ||
        ex.lesson.translations.find((t) => t.language.code === 'es') ||
        ex.lesson.translations[0];

      const courseTranslation =
        ex.lesson.course.translations.find((t) => t.language.code === lang) ||
        ex.lesson.course.translations.find((t) => t.language.code === 'es') ||
        ex.lesson.course.translations[0];

      return {
        id: ex.id,
        title: translation?.title ?? 'Sin título',
        type: ex.type,
        experience: ex.experience,

        lessonTitle: lessonTranslation?.title ?? '-',
        courseTitle: courseTranslation?.title ?? '-',
      };
    });
  }
}
