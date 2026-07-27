import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class EnergyService {
  private readonly MAX_ENERGY = 5;
  private readonly REGEN_MINUTES = 30;

  constructor(private prisma: PrismaService) {}

  async regenerate(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const now = new Date();
    const diff = (now.getTime() - user.updatedAt.getTime()) / 1000 / 60;

    const regenerated = Math.floor(diff / this.REGEN_MINUTES);
    const energy = Math.min(this.MAX_ENERGY, user.energy + regenerated);

    return energy;
  }

  async consume(userId: string, energy: number) {
    if (energy <= 0) {
      throw new BadRequestException('No energy available');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { energy: energy - 1 },
    });
  }
}
