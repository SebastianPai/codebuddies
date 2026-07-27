import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProgressDto } from './dto/create-progress.dto';
import { RewardService } from '../game/reward/reward.service';
import { ReferralValidationService } from '../referrals/services/referral-validation.service';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardService: RewardService,
    private readonly referralValidationService: ReferralValidationService,
  ) {}

  async createProgress(dto: CreateProgressDto) {
    this.logger.debug(`Recibido DTO: ${JSON.stringify(dto)}`);

    if (!dto.userId) {
      throw new BadRequestException('userId es requerido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: {
        id: true,
        experience: true,
        streak: true,
        bestStreak: true,
        lastLearningActivityAt: true,
      },
    });

    if (!user) {
      this.logger.warn(`Usuario no encontrado: ${dto.userId}`);
      throw new NotFoundException(`Usuario con ID ${dto.userId} no encontrado`);
    }

    const whereClause: Prisma.CompletionWhereInput = { userId: dto.userId };
    if (dto.courseId) whereClause.courseId = dto.courseId;
    if (dto.lessonId) whereClause.lessonId = dto.lessonId;
    if (dto.exerciseId) whereClause.exerciseId = dto.exerciseId;

    try {
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

      if (dto.exerciseId) {
        const exercise = await this.prisma.exercise.findUnique({
          where: { id: dto.exerciseId },
          select: { experience: true, coins: true, lessonId: true },
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
      }

      if (lessonIdToUse && !dto.exerciseId) {
        const lesson = await this.prisma.lesson.findUnique({
          where: { id: lessonIdToUse },
          select: { experience: true, coins: true },
        });

        if (!lesson) {
          this.logger.warn(`Lección no encontrada: ${lessonIdToUse}`);
          throw new NotFoundException(`Lección ${lessonIdToUse} no encontrada`);
        }

        xpToAdd += lesson.experience || 0;
        coinsToAdd += lesson.coins || 0;
      }

      const completion = await this.prisma.completion.create({
        data: {
          userId: dto.userId,
          courseId: dto.courseId ?? null,
          lessonId: lessonIdToUse ?? null,
          exerciseId: dto.exerciseId ?? null,
        },
      });

      if (xpToAdd > 0 || coinsToAdd > 0 || dto.exerciseId) {
        const nextExperience = user.experience + xpToAdd;
        const nextLevel = this.rewardService.calculateLevel(nextExperience);

        await this.prisma.user.update({
          where: { id: dto.userId },
          data: {
            experience: { increment: xpToAdd },
            coins: { increment: coinsToAdd },
            level: nextLevel,
            ...(dto.exerciseId ? this.getStreakUpdateData(user) : {}),
          },
        });

        if (xpToAdd > 0) {
          await this.prisma.xPTransaction.create({
            data: {
              userId: dto.userId,
              amount: xpToAdd,
              reason: `progress:${this.getActivityType(dto)}`,
            },
          });
        }

        if (coinsToAdd > 0) {
          await this.prisma.coinTransaction.create({
            data: {
              userId: dto.userId,
              amount: coinsToAdd,
              reason: `progress:${this.getActivityType(dto)}`,
            },
          });
        }
      }

      await this.prisma.activity.create({
        data: {
          userId: dto.userId,
          type: this.getActivityType(dto),
          metadata: {
            courseId: dto.courseId,
            lessonId: lessonIdToUse ?? null,
            exerciseId: dto.exerciseId ?? null,
            xpAdded: xpToAdd,
            coinsAdded: coinsToAdd,
          },
        },
      });

      await this.referralValidationService.evaluateReferralsForUser(dto.userId);

      this.logger.debug(
        `Creado con éxito: completionId=${completion.id} xpAdded=${xpToAdd} coinsAdded=${coinsToAdd}`,
      );

      return {
        ...completion,
        xpAdded: xpToAdd,
        coinsAdded: coinsToAdd,
      };
    } catch (error: unknown) {
      const errorDetails =
        error instanceof Error
          ? { errorMessage: error.message, stack: error.stack }
          : { errorMessage: 'Unknown progress error', stack: undefined };

      this.logger.error(
        `Error crítico procesando progreso: ${JSON.stringify(dto)}`,
        errorDetails.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw error;
    }
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
    const today = this.startOfDay(new Date());
    const last = user.lastLearningActivityAt
      ? this.startOfDay(user.lastLearningActivityAt)
      : null;

    if (last?.getTime() === today.getTime()) {
      return {};
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const continued = last?.getTime() === yesterday.getTime();
    const nextStreak = continued ? user.streak + 1 : 1;

    return {
      streak: nextStreak,
      bestStreak: Math.max(user.bestStreak, nextStreak),
      lastLearningActivityAt: new Date(),
    };
  }

  private startOfDay(date: Date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }
}
