import { BadRequestException, Controller, Get, Injectable, Logger, Module, Param, Post, UseGuards } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType, Prisma } from '@prisma/client';
import { EmailModule } from '../email/email.module';
import { EmailService } from '../email/email.service';
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

// ─── Recordatorios para quien no volvió ─────────────────────────────────
//
// Día 1 (se registró ayer y no volvió) y día 3 (sigue sin volver): una
// notificación en la app para todos y, solo a quien aceptó correos de
// marketing, un correo con enlace de baja. Cada recordatorio se manda una
// sola vez (queda marcado en la notificación).

const STEP_NAMES: Record<string, string> = {
  lesson: 'completar tu primera lección (2 minutos)',
  exercise: 'resolver tu primer ejercicio',
  avatar: 'entrar al mundo y crear tu avatar',
  startup: 'fundar tu startup en CodeStudio',
  streak: 'volver hoy para empezar tu racha',
};

const HOUR = 3_600_000;
const SITE_URL = (process.env.WEB_URL || 'https://codebuddies.tech').replace(/\/+$/, '');

@Injectable()
export class StarterRemindersService {
  private readonly logger = new Logger(StarterRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly starter: StarterService,
    private readonly email: EmailService,
  ) {}

  @Cron('15 * * * *')
  async run() {
    if (process.env.NODE_ENV === 'test') return;
    const now = Date.now();
    await this.remind('starter-d1', new Date(now - 48 * HOUR), new Date(now - 24 * HOUR), 20 * HOUR);
    await this.remind('starter-d3', new Date(now - 96 * HOUR), new Date(now - 72 * HOUR), 48 * HOUR);
  }

  /** Usuarios registrados en [from, to) que no han vuelto en `quietMs`. */
  private async remind(kind: string, from: Date, to: Date, quietMs: number) {
    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: from, lt: to } },
      select: { id: true, email: true, username: true, createdAt: true, lastLoginAt: true },
      take: 500,
    });
    let sent = 0;
    for (const user of users) {
      const lastSeen = user.lastLoginAt?.getTime() ?? user.createdAt.getTime();
      if (Date.now() - lastSeen < quietMs) continue;
      const already = await this.prisma.notification.findFirst({
        where: { userId: user.id, metadata: { path: ['kind'], equals: kind } },
        select: { id: true },
      });
      if (already) continue;
      const overview = await this.starter.overview(user.id);
      if (overview.finished) continue;
      const pending = overview.steps.filter((step) => !step.claimed);
      if (pending.length === 0) continue;
      const coins = pending.reduce((sum, step) => sum + step.coins, 0) + overview.bonus;
      const next = pending.find((step) => !step.done) ?? pending[0];
      const title = kind === 'starter-d1' ? `Te esperan ${coins} monedas` : `Todavía estás a tiempo: ${coins} monedas`;
      const body = `Te faltan ${pending.length} paso${pending.length === 1 ? '' : 's'}. El siguiente: ${STEP_NAMES[next.key]}.`;
      await this.prisma.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.MISSION_AVAILABLE,
          title,
          body,
          metadata: { kind, coins, nextStep: next.key, href: '/dashboard' } as Prisma.InputJsonValue,
        },
      });
      await this.email.sendMarketingMessage(
        user,
        title,
        `<p>Hola ${user.username},</p>
<p>${body}</p>
<p>Cada paso te da monedas y al completarlos todos te llevas un bono de ${overview.bonus}.</p>
<p><a href="${SITE_URL}/dashboard" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#facc15;color:#000;font-weight:700;text-decoration:none">Seguir donde quedé</a></p>`,
      );
      sent++;
    }
    if (sent > 0) this.logger.log(`Recordatorios ${kind}: ${sent}`);
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
  imports: [PrismaModule, EmailModule],
  controllers: [StarterController],
  providers: [StarterService, StarterRemindersService],
})
export class StarterModule {}
