import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EnergyService } from './energy/energy.service';
import { RewardService } from './reward/reward.service';

@Injectable()
export class GameService {
  constructor(
    private prisma: PrismaService,
    private energyService: EnergyService,
    private rewardService: RewardService,
  ) {}

  async completeExercise(userId: string, exerciseId: string, answer: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');

    // Idempotencia: solo se otorga recompensa la primera vez que este
    // usuario completa este ejercicio. Antes se creaba un Completion y se
    // sumaban XP/coins en cada llamada sin comprobar esto, permitiendo
    // farmear XP/coins repitiendo la misma petición indefinidamente.
    const alreadyCompleted = await this.prisma.completion.findFirst({
      where: { userId, exerciseId },
    });

    await this.energyService.regenerateAndConsume(userId);

    const isCorrect = answer === (exercise.content as any)?.answer;
    const grantsReward = isCorrect && !alreadyCompleted;

    let newXP = user.experience;
    let newCoins = user.coins;
    let newLevel = user.level;

    if (grantsReward) {
      newXP = this.rewardService.calculateNewXP(
        user.experience,
        exercise.experience,
      );

      newCoins = user.coins + exercise.coins;
      newLevel = this.rewardService.calculateLevel(newXP);
    }

    const operations: any[] = [];
    if (grantsReward) {
      operations.push(
        this.prisma.user.update({
          where: { id: userId },
          data: {
            experience: newXP,
            coins: newCoins,
            level: newLevel,
          },
        }),
      );
    }
    if (!alreadyCompleted) {
      operations.push(
        this.prisma.completion.create({
          data: {
            userId,
            exerciseId,
          },
        }),
      );
    }
    if (operations.length) {
      await this.prisma.$transaction(operations);
    }

    return {
      correct: isCorrect,
      xp: grantsReward ? exercise.experience : 0,
      coins: grantsReward ? exercise.coins : 0,
      level: newLevel,
    };
  }
}
