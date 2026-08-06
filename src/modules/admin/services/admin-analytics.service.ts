import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

type TranslationLike = { title: string; language: { code: string } };

const MIN_ATTEMPTS_TO_RANK = 3;

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // CUR8: panel de "experiencia del estudiante" — dónde abandonan un curso
  // y qué ejercicios tienen más reintentos/fallos. Se apoya en DB7
  // (Completion.attempts/score) y en ExerciseAttempt (todo intento, no solo
  // el que completa) para no depender de Enrollment, que hoy no se escribe
  // en ningún flujo del producto.
  async getStudentExperience() {
    const [courseDropoff, hardestExercises] = await Promise.all([
      this.getCourseDropoff(),
      this.getHardestExercises(),
    ]);

    return { courseDropoff, hardestExercises };
  }

  private async getCourseDropoff() {
    const courses = await this.prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        translations: { select: { title: true, language: { select: { code: true } } } },
        lessons: {
          orderBy: { order: 'asc' },
          select: {
            exercises: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                translations: {
                  select: { title: true, language: { select: { code: true } } },
                },
              },
            },
          },
        },
      },
    });

    const results: Array<{
      courseId: string;
      title: string;
      startedCount: number;
      completionRate: number;
      dropoffStep: { title: string; order: number; dropPercent: number } | null;
      funnel: Array<{ exerciseId: string; order: number; title: string; completedCount: number; retentionPercent: number }>;
    }> = [];

    for (const course of courses) {
      const exercises = course.lessons.flatMap((lesson) => lesson.exercises);
      if (exercises.length === 0) continue;
      const exerciseIds = exercises.map((exercise) => exercise.id);

      const [starters, completionCounts] = await Promise.all([
        this.prisma.completion.findMany({
          where: { exerciseId: { in: exerciseIds } },
          select: { userId: true },
          distinct: ['userId'],
        }),
        this.prisma.completion.groupBy({
          by: ['exerciseId'],
          where: { exerciseId: { in: exerciseIds } },
          _count: true,
        }),
      ]);

      const startedCount = starters.length;
      if (startedCount === 0) continue;

      const countByExercise = new Map(
        completionCounts.map((row) => [row.exerciseId, row._count]),
      );

      const funnel = exercises.map((exercise, order) => {
        const completedCount = countByExercise.get(exercise.id) ?? 0;
        return {
          exerciseId: exercise.id,
          order,
          title: this.pickTitle(exercise.translations),
          completedCount,
          retentionPercent: Math.round((completedCount / startedCount) * 100),
        };
      });

      let dropoffStep: (typeof results)[number]['dropoffStep'] = null;
      for (let i = 1; i < funnel.length; i += 1) {
        const dropPercent = funnel[i - 1].retentionPercent - funnel[i].retentionPercent;
        if (dropPercent > 0 && (!dropoffStep || dropPercent > dropoffStep.dropPercent)) {
          dropoffStep = { title: funnel[i].title, order: funnel[i].order, dropPercent };
        }
      }

      results.push({
        courseId: course.id,
        title: this.pickTitle(course.translations),
        startedCount,
        completionRate: funnel[funnel.length - 1]?.retentionPercent ?? 0,
        dropoffStep,
        funnel,
      });
    }

    return results.sort((a, b) => a.completionRate - b.completionRate);
  }

  private async getHardestExercises(take = 15) {
    const [totalCounts, failCounts, attemptStats] = await Promise.all([
      this.prisma.exerciseAttempt.groupBy({ by: ['exerciseId'], _count: true }),
      this.prisma.exerciseAttempt.groupBy({
        by: ['exerciseId'],
        where: { correct: false },
        _count: true,
      }),
      this.prisma.completion.groupBy({
        by: ['exerciseId'],
        where: { exerciseId: { not: null } },
        _avg: { attempts: true },
        _count: true,
      }),
    ]);

    const failByExercise = new Map(failCounts.map((row) => [row.exerciseId, row._count]));
    const avgAttemptsByExercise = new Map(
      attemptStats
        .filter((row): row is typeof row & { exerciseId: string } => !!row.exerciseId)
        .map((row) => [row.exerciseId, { avg: row._avg.attempts ?? 1, completedCount: row._count }]),
    );

    const ranked = totalCounts
      .filter((row) => row._count >= MIN_ATTEMPTS_TO_RANK)
      .map((row) => {
        const failedAttempts = failByExercise.get(row.exerciseId) ?? 0;
        const completionStats = avgAttemptsByExercise.get(row.exerciseId);
        return {
          exerciseId: row.exerciseId,
          totalAttempts: row._count,
          failedAttempts,
          failureRatePercent: Math.round((failedAttempts / row._count) * 100),
          avgAttemptsToSucceed: completionStats
            ? Math.round(completionStats.avg * 10) / 10
            : null,
          completedCount: completionStats?.completedCount ?? 0,
        };
      })
      .sort((a, b) => b.failureRatePercent - a.failureRatePercent)
      .slice(0, take);

    if (ranked.length === 0) return [];

    const exercises = await this.prisma.exercise.findMany({
      where: { id: { in: ranked.map((row) => row.exerciseId) } },
      select: {
        id: true,
        translations: { select: { title: true, language: { select: { code: true } } } },
        lesson: {
          select: {
            courseId: true,
            course: {
              select: { translations: { select: { title: true, language: { select: { code: true } } } } },
            },
          },
        },
      },
    });
    const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));

    return ranked.map((row) => {
      const exercise = exerciseById.get(row.exerciseId);
      return {
        ...row,
        title: exercise ? this.pickTitle(exercise.translations) : row.exerciseId,
        courseId: exercise?.lesson.courseId ?? null,
        courseTitle: exercise ? this.pickTitle(exercise.lesson.course.translations) : null,
      };
    });
  }

  private pickTitle(translations: TranslationLike[], lang = 'es') {
    const translation =
      translations.find((t) => t.language.code === lang) ||
      translations.find((t) => t.language.code === 'es') ||
      translations[0];
    return translation?.title ?? '';
  }
}
