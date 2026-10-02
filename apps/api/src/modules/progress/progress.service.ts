import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ActivityType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProgressDto } from './dto/create-progress.dto';
import { RewardService } from '../game/reward/reward.service';
import { ReferralValidationService } from '../referrals/services/referral-validation.service';
import { computeStreakUpdate } from '../../common/utils/streak.util';
import { PremiumAccessService } from '../premium-access/premium-access.service';
import { BattlePassService } from '../battle-pass/services/battle-pass.service';
import { CoinBoostsService } from '../boosts/coin-boosts.service';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardService: RewardService,
    private readonly referralValidationService: ReferralValidationService,
    private readonly premiumAccessService: PremiumAccessService,
    private readonly battlePassService: BattlePassService,
    @Optional() private readonly coinBoosts?: CoinBoostsService,
  ) {}

  async createProgress(
    userId: string,
    dto: CreateProgressDto,
    role?: Role,
    options: { bypassLocks?: boolean } = {},
  ) {
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
    // Teoría = completion con exerciseId null. Sin este filtro, un ejercicio
    // ya resuelto de la misma lección (que también guarda lessonId) se
    // tomaba como "teoría ya completada" y la teoría nunca se registraba —
    // la lección siguiente quedaba bloqueada para siempre.
    whereClause.exerciseId = dto.exerciseId ?? null;

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

      // La teoría de una lección bloqueada por progresión no se puede marcar
      // leída (el contenido ni siquiera viaja al cliente).
      if (
        await this.premiumAccessService.isLessonProgressionLocked({
          courseId: lesson.courseId,
          lessonId: lessonIdToUse,
          lessonOrder: lesson.order,
          userId,
          role,
          bypass: options.bypassLocks,
        })
      ) {
        throw new ForbiddenException('Completá la lección anterior primero');
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

    let boostBonus = 0;
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
          // Boost de monedas activo (personal o comunitario): extra aparte.
          boostBonus = (await this.coinBoosts?.grantBonus(tx, userId, coinsToAdd, `progress:${activityType}`)) ?? 0;
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
      // Incluye el extra del boost para que la tarjeta de recompensa muestre
      // lo que de verdad llegó; boostBonus lo deja ver por separado.
      coinsAdded: coinsToAdd + boostBonus,
      boostBonus,
    };
  }

  // ---------------------------------------------------------------------------
  // Herramientas de test SOLO para admins (probar animaciones de recompensa /
  // estados de "completado" sin tener que resolver los ejercicios a mano).
  // Operan siempre sobre el progreso del PROPIO admin — el controller nunca
  // expone un userId de terceros.
  // ---------------------------------------------------------------------------

  private async removeCompletions(
    userId: string,
    where: Prisma.CompletionWhereInput,
  ) {
    const completions = await this.prisma.completion.findMany({
      where: { userId, ...where },
      include: {
        lesson: { select: { experience: true, coins: true } },
        exercise: { select: { experience: true, coins: true } },
      },
    });

    if (completions.length === 0) {
      return { removed: 0, xpRemoved: 0, coinsRemoved: 0 };
    }

    let xpGranted = 0;
    let coinsGranted = 0;
    for (const completion of completions) {
      xpGranted +=
        completion.lesson?.experience ?? completion.exercise?.experience ?? 0;
      coinsGranted +=
        completion.lesson?.coins ?? completion.exercise?.coins ?? 0;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.completion.deleteMany({
        where: { id: { in: completions.map((completion) => completion.id) } },
      });

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { experience: true, coins: true },
      });

      const nextExperience = Math.max(0, (user?.experience ?? 0) - xpGranted);
      const nextCoins = Math.max(0, (user?.coins ?? 0) - coinsGranted);
      const xpRemoved = (user?.experience ?? 0) - nextExperience;
      const coinsRemoved = (user?.coins ?? 0) - nextCoins;

      await tx.user.update({
        where: { id: userId },
        data: {
          experience: nextExperience,
          coins: nextCoins,
          level: this.rewardService.calculateLevel(nextExperience),
        },
      });

      if (xpRemoved > 0) {
        await tx.xPTransaction.create({
          data: { userId, amount: -xpRemoved, reason: 'admin-test:reset' },
        });
      }
      if (coinsRemoved > 0) {
        await tx.coinTransaction.create({
          data: { userId, amount: -coinsRemoved, reason: 'admin-test:reset' },
        });
      }

      return { xpRemoved, coinsRemoved };
    });

    return { removed: completions.length, ...result };
  }

  async adminResetLesson(userId: string, lessonId: string) {
    return this.removeCompletions(userId, { lessonId });
  }

  async adminResetCourse(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        lessons: { select: { id: true, exercises: { select: { id: true } } } },
      },
    });
    if (!course) throw new NotFoundException('Curso no encontrado');

    const lessonIds = course.lessons.map((lesson) => lesson.id);
    const exerciseIds = course.lessons.flatMap((lesson) =>
      lesson.exercises.map((exercise) => exercise.id),
    );

    return this.removeCompletions(userId, {
      OR: [
        { courseId },
        { lessonId: { in: lessonIds } },
        { exerciseId: { in: exerciseIds } },
      ],
    });
  }

  async adminCompleteCourse(userId: string, courseId: string, role?: Role) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        lessons: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            exercises: { orderBy: { order: 'asc' }, select: { id: true } },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Curso no encontrado');

    let xpAdded = 0;
    let coinsAdded = 0;

    // Reusa createProgress para cada lección/ejercicio: ya es idempotente
    // (devuelve alreadyCompleted sin volver a sumar) y mantiene todos los
    // efectos (XPTransaction, streak, actividad) consistentes con el flujo
    // real del estudiante.
    for (const lesson of course.lessons) {
      const lessonResult = await this.createProgress(
        userId,
        { lessonId: lesson.id },
        role,
        { bypassLocks: true },
      );
      xpAdded += lessonResult.xpAdded ?? 0;
      coinsAdded += lessonResult.coinsAdded ?? 0;

      for (const exercise of lesson.exercises) {
        const exerciseResult = await this.createProgress(
          userId,
          { exerciseId: exercise.id, courseId },
          role,
        );
        xpAdded += exerciseResult.xpAdded ?? 0;
        coinsAdded += exerciseResult.coinsAdded ?? 0;
      }
    }

    return { xpAdded, coinsAdded };
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
  //
  // El progreso cuenta PASOS (teoría de cada lección + ejercicios
  // calificables), igual que el candado de progresión: el "siguiente paso"
  // puede ser leer una lección, no solo un ejercicio.
  async getContinueLearning(userId: string, lang: string = 'es', take = 4) {
    const completions = await this.prisma.completion.findMany({
      where: { userId, lessonId: { not: null } },
      select: {
        createdAt: true,
        exerciseId: true,
        lessonId: true,
        lesson: { select: { courseId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const theoryDone = new Set<string>();
    const exerciseDone = new Set<string>();
    const lastActivityByCourse = new Map<string, Date>();
    for (const c of completions) {
      if (c.exerciseId) exerciseDone.add(c.exerciseId);
      else if (c.lessonId) theoryDone.add(c.lessonId);
      const courseId = c.lesson?.courseId;
      if (courseId && !lastActivityByCourse.has(courseId)) {
        lastActivityByCourse.set(courseId, c.createdAt);
      }
    }

    const candidateCourseIds = [...lastActivityByCourse.keys()];
    if (candidateCourseIds.length === 0) return [];

    const courses = await this.prisma.course.findMany({
      where: { id: { in: candidateCourseIds }, status: 'PUBLISHED' },
      select: {
        id: true,
        imageUrl: true,
        translations: {
          select: { title: true, language: { select: { code: true } } },
        },
        lessons: {
          where: { status: 'PUBLISHED' },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            exercises: {
              where: { status: 'PUBLISHED' },
              orderBy: { order: 'asc' },
              select: { id: true, type: true, lessonId: true },
            },
          },
        },
      },
    });

    type Step =
      | { kind: 'theory'; lessonId: string }
      | { kind: 'exercise'; lessonId: string; id: string; type: string };

    const inProgress = courses
      .map((course) => {
        const steps: Step[] = course.lessons.flatMap((lesson) => [
          { kind: 'theory' as const, lessonId: lesson.id },
          ...lesson.exercises
            .filter((ex) => PremiumAccessService.isGradable(ex.type))
            .map((ex) => ({
              kind: 'exercise' as const,
              lessonId: lesson.id,
              id: ex.id,
              type: ex.type,
            })),
        ]);
        const isDone = (step: Step) =>
          step.kind === 'theory'
            ? theoryDone.has(step.lessonId)
            : exerciseDone.has(step.id);

        const totalSteps = steps.length;
        const doneSteps = steps.filter(isDone).length;
        if (totalSteps === 0 || doneSteps === 0) return null;
        if (doneSteps >= totalSteps) return null; // ya completado

        const next = steps.find((step) => !isDone(step))!;
        const exercises = steps.filter((step) => step.kind === 'exercise');

        const translation =
          course.translations.find((t) => t.language.code === lang) ||
          course.translations.find((t) => t.language.code === 'es') ||
          course.translations[0];

        return {
          courseId: course.id,
          title: translation?.title ?? null,
          imageUrl: course.imageUrl,
          totalExercises: exercises.length,
          completedExercises: exercises.filter(isDone).length,
          progressPercent: Math.round((doneSteps / totalSteps) * 100),
          lastActivityAt: lastActivityByCourse.get(course.id)!,
          nextLessonId: next.lessonId,
          nextExercise:
            next.kind === 'exercise'
              ? { id: next.id, type: next.type, lessonId: next.lessonId }
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
