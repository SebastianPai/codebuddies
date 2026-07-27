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

    const energy = await this.energyService.regenerate(userId);
    await this.energyService.consume(userId, energy);

    const isCorrect = answer === (exercise.content as any)?.answer;

    let newXP = user.experience;
    let newCoins = user.coins;
    let newLevel = user.level;

    if (isCorrect) {
      newXP = this.rewardService.calculateNewXP(
        user.experience,
        exercise.experience,
      );

      newCoins = user.coins + exercise.coins;
      newLevel = this.rewardService.calculateLevel(newXP);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          experience: newXP,
          coins: newCoins,
          level: newLevel,
        },
      }),
      this.prisma.completion.create({
        data: {
          userId,
          exerciseId,
        },
      }),
    ]);

    return {
      correct: isCorrect,
      xp: isCorrect ? exercise.experience : 0,
      coins: isCorrect ? exercise.coins : 0,
      level: newLevel,
    };
  }
}
