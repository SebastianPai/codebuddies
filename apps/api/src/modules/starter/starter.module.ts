import { BadRequestException, Controller, Get, Injectable, Module, Param, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/decorators/current-user.decorator';

// "Primeros pasos" para quien recién llega a la web: cinco pasos medidos
// con lo que la persona hizo de verdad (no se marcan a mano), cada uno con
// monedas y un bono al completarlos todos. La primera victoria llega en 2
// minutos (una lección) y el último paso es volver mañana, que es lo que
// más predice que alguien se quede.
//
// Cada premio se paga una sola vez: la razón del CoinTransaction es la llave.

export const STARTER_STEPS = [
  { key: 'lesson', coins: 30 },
  { key: 'exercise', coins: 40 },
  { key: 'avatar', coins: 40 },
  { key: 'startup', coins: 60 },
  { key: 'streak', coins: 80 },
] as const;
export const STARTER_BONUS = 300;

type StepKey = (typeof STARTER_STEPS)[number]['key'];

const reasonFor = (key: string) => `starter:${key}`;

@Injectable()
export class StarterService {
  constructor(private readonly prisma: PrismaService) {}

  private async progress(userId: string): Promise<Record<StepKey, boolean>> {
    const [lesson, exercise, avatar, startup, user] = await Promise.all([
      this.prisma.completion.count({ where: { userId, lessonId: { not: null } } }),
      this.prisma.completion.count({ where: { userId, exerciseId: { not: null } } }),
      // El avatar se crea al entrar al juego por primera vez.
      this.prisma.avatar.count({ where: { userId } }),
      this.prisma.codeStudioCompany.count({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { streak: true, bestStreak: true } }),
    ]);
    return {
      lesson: lesson > 0,
      exercise: exercise > 0,
      avatar: avatar > 0,
      startup: startup > 0,
      streak: Math.max(user?.streak ?? 0, user?.bestStreak ?? 0) >= 2,
    };
  }

  async overview(userId: string) {
    const [done, paid] = await Promise.all([
      this.progress(userId),
      this.prisma.coinTransaction.findMany({ where: { userId, reason: { startsWith: 'starter:' } }, select: { reason: true } }),
    ]);
    const claimed = new Set(paid.map((row) => row.reason));
    const steps = STARTER_STEPS.map((step) => ({ key: step.key, coins: step.coins, done: done[step.key], claimed: claimed.has(reasonFor(step.key)) }));
    return {
      steps,
      bonus: STARTER_BONUS,
      bonusClaimed: claimed.has(reasonFor('bonus')),
      // Se deja de mostrar cuando ya cobró el bono final.
      finished: claimed.has(reasonFor('bonus')),
    };
  }

  async claim(userId: string, key: string) {
    const done = await this.progress(userId);
    const step = STARTER_STEPS.find((entry) => entry.key === key);
    let coins: number;
    if (key === 'bonus') {
      const paid = await this.prisma.coinTransaction.count({ where: { userId, reason: { in: STARTER_STEPS.map((entry) => reasonFor(entry.key)) } } });
      if (paid < STARTER_STEPS.length) throw new BadRequestException('Primero reclama los cinco pasos.');
      coins = STARTER_BONUS;
    } else {
      if (!step) throw new BadRequestException('Paso desconocido.');
      if (!done[step.key]) throw new BadRequestException('Todavía no completaste este paso.');
      coins = step.coins;
    }
    const reason = reasonFor(key);
    await this.prisma.$transaction(async (tx) => {
      const already = await tx.coinTransaction.findFirst({ where: { userId, reason }, select: { id: true } });
      if (already) throw new BadRequestException('Ya lo reclamaste.');
      await tx.user.update({ where: { id: userId }, data: { coins: { increment: coins } } });
      await tx.coinTransaction.create({ data: { userId, amount: coins, reason } });
    });
    return { coins, overview: await this.overview(userId) };
  }
}

@UseGuards(JwtAuthGuard)
@Controller('starter')
export class StarterController {
  constructor(private readonly starter: StarterService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser) {
    return this.starter.overview(user.userId);
  }

  @Post('claim/:key')
  claim(@CurrentUser() user: AuthUser, @Param('key') key: string) {
    return this.starter.claim(user.userId, key);
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [StarterController],
  providers: [StarterService],
})
export class StarterModule {}
