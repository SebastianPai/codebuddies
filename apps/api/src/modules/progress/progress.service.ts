import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProgressDto } from './dto/create-progress.dto';
import { RewardService } from '../game/reward/reward.service';
import { ReferralValidationService } from '../referrals/services/referral-validation.service';
import { computeStreakUpdate } from '../../common/utils/streak.util';
import { PremiumAccessService } from '../premium-access/premium-access.service';
import { BattlePassService } from '../battle-pass/services/battle-pass.service';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardService: RewardService,
    private readonly referralValidationService: ReferralValidationService,
    private readonly premiumAccessService: PremiumAccessService,
    private readonly battlePassService: BattlePassService,
  ) {}

  async createProgress(userId: string, dto: CreateProgressDto, role?: Role) {
    this.logger.debug(`Recibido DTO: ${JSON.stringify(dto)} userId=${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        experience: true,
        streak: true,
        bestStreak: true,
        lastLearningActivityAt: true,
      },
    });

    if (!user) {
      this.logger.warn(`Usuario no encontrado: ${userId}`);
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    const whereClause: Prisma.CompletionWhereInput = { userId };
    if (dto.courseId) whereClause.courseId = dto.courseId;
    if (dto.lessonId) whereClause.lessonId = dto.lessonId;
    if (dto.exerciseId) whereClause.exerciseId = dto.exerciseId;

    const existing = await this.prisma.completion.findFirst({
      where: whereClause,
    });

    if (existing) {
      this.logger.debug(`Ya completado: ${existing.id}`);
      return {
        ...existing,
        alreadyCompleted: true,
        xpAdded: 0,
        coinsAdded: 0,
      };
    }

    let xpToAdd = 0;
    let coinsToAdd = 0;
    let lessonIdToUse = dto.lessonId;
    let gatingInfo: {
      courseId: string;
      order: number;
      freeLimit: number;
    } | null = null;

    if (dto.exerciseId) {
      const exercise = await this.prisma.exercise.findUnique({
        where: { id: dto.exerciseId },
        select: {
          experience: true,
          coins: true,
          lessonId: true,
          lesson: {
            select: {
              order: true,
              courseId: true,
              course: { select: { freeLimit: true } },
            },
          },
        },
      });

      if (!exercise) {
        this.logger.warn(`Ejercicio no encontrado: ${dto.exerciseId}`);
        throw new NotFoundException(
          `Ejercicio ${dto.exerciseId} no encontrado`,
        );
      }

      xpToAdd += exercise.experience || 0;
      coinsToAdd += exercise.coins || 0;

      if (!lessonIdToUse) lessonIdToUse = exercise.lessonId;
      gatingInfo = {
        courseId: exercise.lesson.courseId,
        order: exercise.lesson.order,
        freeLimit: exercise.lesson.course.freeLimit,
      };
    }

    if (lessonIdToUse && !dto.exerciseId) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: lessonIdToUse },
        select: {
          experience: true,
          coins: true,
          order: true,
          courseId: true,
          course: { select: { freeLimit: true } },
        },
      });

      if (!lesson) {
        this.logger.warn(`Lección no encontrada: ${lessonIdToUse}`);
        throw new NotFoundException(`Lección ${lessonIdToUse} no encontrada`);
      }

      xpToAdd += lesson.experience || 0;
      coinsToAdd += lesson.coins || 0;
      gatingInfo = {
        courseId: lesson.courseId,
        order: lesson.order,
        freeLimit: lesson.course.freeLimit,
      };
    }

    // Cierra el mismo bypass que ya se tapó en exercise.service.ts: sin este
    // chequeo, alguien podía pegarle directo a este endpoint con el id de
    // un ejercicio/lección bloqueada y llevarse el XP/completion igual,
    // sin pasar nunca por el gating de lectura.
    if (gatingInfo) {
      const locked = await this.premiumAccessService.isLessonLocked({
        courseId: gatingInfo.courseId,
        lessonOrder: gatingInfo.order,
        freeLimit: gatingInfo.freeLimit,
        userId,
        role,
      });
      if (locked) {
        throw new ForbiddenException(
          'Este contenido requiere una suscripción Premium',
        );
      }
    }

    const activityType = this.getActivityType(dto);

    const completion = await this.prisma.$transaction(async (tx) => {
      const created = await tx.completion.create({
        data: {
          userId,
          courseId: dto.courseId ?? null,
          lessonId: lessonIdToUse ?? null,
          exerciseId: dto.exerciseId ?? null,
          attempts: dto.attempts ?? 1,
          score: dto.score ?? null,
          timeSpentSeconds: dto.timeSpentSeconds ?? null,
        },
      });

      if (xpToAdd > 0 || coinsToAdd > 0 || dto.exerciseId) {
        const nextExperience = user.experience + xpToAdd;
        const nextLevel = this.rewardService.calculateLevel(nextExperience);

        await tx.user.update({
          where: { id: userId },
          data: {
            experience: { increment: xpToAdd },
            coins: { increment: coinsToAdd },
            level: nextLevel,
            ...(dto.exerciseId ? this.getStreakUpdateData(user) : {}),
          },
        });

        if (xpToAdd > 0) {
          await tx.xPTransaction.create({
            data: {
              userId,
              amount: xpToAdd,
              reason: `progress:${activityType}`,
            },
          });
          // XP de Battle Pass separado de User.experience -- ver
          // BattlePassService.awardXp. No-op si no hay temporada activa.
          await this.battlePassService.awardXp(userId, xpToAdd, tx);
        }

        if (coinsToAdd > 0) {
          await tx.coinTransaction.create({
            data: {
              userId,
              amount: coinsToAdd,
              reason: `progress:${activityType}`,
            },
          });
        }
      }

      await tx.activity.create({
        data: {
          userId,
          type: activityType,
          metadata: {
            courseId: dto.courseId,
            lessonId: lessonIdToUse ?? null,
            exerciseId: dto.exerciseId ?? null,
            xpAdded: xpToAdd,
            coinsAdded: coinsToAdd,
          },
        },
      });

      return created;
    });

    await this.referralValidationService.evaluateReferralsForUser(userId);

    this.logger.debug(
      `Creado con éxito: completionId=${completion.id} xpAdded=${xpToAdd} coinsAdded=${coinsToAdd}`,
    );

    return {
      ...completion,
      xpAdded: xpToAdd,
      coinsAdded: coinsToAdd,
    };
  }

  async getUserProgress(userId: string) {
    this.logger.debug(`Consultando progreso de: ${userId}`);
    return this.prisma.completion.findMany({
      where: { userId },
      include: {
        course: true,
        lesson: true,
        exercise: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Cursos "en progreso" reales para el dashboard (antes eran datos mock
  // hardcodeados en el frontend). Se derivan de Completion en vez de
  // Enrollment porque Enrollment no se escribe en ningún flujo del
  // producto hoy — sería siempre una tabla vacía.
  async getContinueLearning(userId: string, lang: string = 'es', take = 4) {
    const completions = await this.prisma.completion.findMany({
      where: { userId, exerciseId: { not: null } },
      select: {
        createdAt: true,
        exercise: {
          select: {
            id: true,
            lessonId: true,
            lesson: { select: { courseId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const completedExerciseIds = new Set(
      completions.map((c) => c.exercise!.id),
    );

    const lastActivityByCourse = new Map<string, Date>();
    for (const c of completions) {
      const courseId = c.exercise!.lesson.courseId;
      if (!lastActivityByCourse.has(courseId)) {
        lastActivityByCourse.set(courseId, c.createdAt);
      }
    }

    const candidateCourseIds = [...lastActivityByCourse.keys()];
    if (candidateCourseIds.length === 0) return [];

    const courses = await this.prisma.course.findMany({
      where: { id: { in: candidateCourseIds } },
      include: {
        translations: { include: { language: true } },
        lessons: {
          orderBy: { order: 'asc' },
          include: {
            exercises: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    const inProgress = courses
      .map((course) => {
        const allExercises = course.lessons.flatMap((l) => l.exercises);
        const totalExercises = allExercises.length;
        const completedCount = allExercises.filter((ex) =>
          completedExerciseIds.has(ex.id),
        ).length;

        if (totalExercises === 0 || completedCount === 0) return null;
        if (completedCount >= totalExercises) return null; // ya completado

        const nextExercise = allExercises.find(
          (ex) => !completedExerciseIds.has(ex.id),
        );
        const nextLesson = course.lessons.find((l) =>
          l.exercises.some((ex) => ex.id === nextExercise?.id),
        );

        const translation =
          course.translations.find((t) => t.language.code === lang) ||
          course.translations.find((t) => t.language.code === 'es') ||
          course.translations[0];

        return {
          courseId: course.id,
          title: translation?.title ?? null,
          imageUrl: course.imageUrl,
          totalExercises,
          completedExercises: completedCount,
          progressPercent: Math.round((completedCount / totalExercises) * 100),
          lastActivityAt: lastActivityByCourse.get(course.id)!,
          nextExercise: nextExercise
            ? {
                id: nextExercise.id,
                type: nextExercise.type,
                lessonId: nextLesson?.id ?? nextExercise.lessonId,
              }
            : null,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
      .slice(0, take);

    return inProgress;
  }

  private getActivityType(dto: CreateProgressDto) {
    if (dto.exerciseId) return ActivityType.COMPLETED_EXERCISE;
    if (dto.lessonId) return ActivityType.COMPLETED_LESSON;
    return ActivityType.COMPLETED_COURSE;
  }

  private getStreakUpdateData(user: {
    streak: number;
    bestStreak: number;
    lastLearningActivityAt: Date | null;
  }) {
    const update = computeStreakUpdate({
      streak: user.streak,
      bestStreak: user.bestStreak,
      lastActivityAt: user.lastLearningActivityAt,
    });

    if (!update) return {};

    return {
      streak: update.streak,
      bestStreak: update.bestStreak,
      lastLearningActivityAt: update.lastActivityAt,
    };
  }
}
