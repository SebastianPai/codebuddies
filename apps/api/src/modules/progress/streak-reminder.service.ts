import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { startOfUtcDay } from '../../common/utils/streak.util';

// NF15: recordatorio de racha en riesgo. Sin datos de zona horaria por
// usuario todavía, así que en vez de calcular "las 20:00 hora local de cada
// quien" corre cada 3 horas y avisa una sola vez por día UTC a quien tenga
// racha activa y todavía no registró actividad de aprendizaje hoy — usa la
// misma frontera de día (UTC) que ya define cuándo se corta la racha
// (ver computeStreakUpdate en streak.util.ts), así el aviso nunca queda
// desalineado con el momento real en que la racha se resetearía.
@Injectable()
export class StreakReminderService {
  private readonly logger = new Logger(StreakReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 */3 * * *')
  async sendAtRiskReminders() {
    const now = new Date();
    const today = startOfUtcDay(now);

    const atRiskUsers = await this.prisma.user.findMany({
      where: {
        streak: { gt: 0 },
        OR: [
          { lastLearningActivityAt: null },
          { lastLearningActivityAt: { lt: today } },
        ],
      },
      select: { id: true, streak: true },
    });

    if (atRiskUsers.length === 0) return;

    const alreadyNotifiedUserIds = new Set(
      (
        await this.prisma.notification.findMany({
          where: {
            type: NotificationType.STREAK_AT_RISK,
            createdAt: { gte: today },
            userId: { in: atRiskUsers.map((user) => user.id) },
          },
          select: { userId: true },
        })
      ).map((notification) => notification.userId),
    );

    const hoursLeft = Math.max(
      1,
      Math.ceil((24 - (now.getTime() - today.getTime()) / 3_600_000)),
    );

    for (const user of atRiskUsers) {
      if (alreadyNotifiedUserIds.has(user.id)) continue;

      await this.notificationsService.create({
        userId: user.id,
        type: NotificationType.STREAK_AT_RISK,
        title: `Tu racha de ${user.streak} día${user.streak === 1 ? '' : 's'} está en riesgo`,
        body: `Se rompe en ${hoursLeft}h si no completás una lección o ejercicio hoy.`,
        metadata: { streak: user.streak, hoursLeft },
      });
    }

    this.logger.debug(
      `Recordatorios de racha: ${atRiskUsers.length - alreadyNotifiedUserIds.size} enviados.`,
    );
  }
}
