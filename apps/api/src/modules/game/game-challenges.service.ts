import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RewardService } from './reward/reward.service';

@Injectable()
export class GameChallengesService {
  private readonly logger = new Logger(GameChallengesService.name);

  constructor(
    private prisma: PrismaService,
    private rewardService: RewardService,
  ) {}

  async addXP(userId: string, amount: number, reason = 'generic') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const newXP = this.rewardService.calculateNewXP(user.experience, amount);
    const newLevel = this.rewardService.calculateLevel(newXP);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        experience: newXP,
        level: newLevel,
      },
    });

    this.logger.log(`XP agregado: ${amount} → ${userId} (motivo: ${reason})`);
  }

  async addCoins(userId: string, amount: number, reason = 'generic') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const newCoins = user.coins + amount;

    await this.prisma.user.update({
      where: { id: userId },
      data: { coins: newCoins },
    });

    this.logger.log(
      `Coins agregadas: ${amount} → ${userId} (motivo: ${reason})`,
    );
  }
}
