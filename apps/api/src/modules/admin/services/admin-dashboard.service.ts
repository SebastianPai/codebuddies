import { Injectable } from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../cache/cache.service';

type ChartPoint = { label: string; value: number };

// HI12/PERF4: el dashboard admin corre ~8 queries agregadas en cada carga
// — TTL corto (no es data que necesite estar al segundo, un admin
// recargando la página 5 veces no debería pegarle a Postgres 5 veces).
const DASHBOARD_CACHE_KEY = 'admin:dashboard';
const DASHBOARD_CACHE_TTL_SECONDS = 30;

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getDashboard() {
    return this.cacheService.getOrSet(
      DASHBOARD_CACHE_KEY,
      DASHBOARD_CACHE_TTL_SECONDS,
      () => this.fetchDashboard(),
    );
  }

  private async fetchDashboard() {
    const [
      totalUsers,
      activeUsers,
      dailyActiveUsers,
      weeklyActiveUsers,
      courses,
      lessons,
      certificatesIssued,
      premiumSubscribers,
      newUsers,
      certificates,
      xpTransactions,
      recentActivity,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.countActiveUsersSince(30),
      // DAU/WAU/MAU (sección 12/13 del pedido): mismo criterio de
      // "actividad" que ya usaba activeUsers (Activity o Completion en la
      // ventana), solo con ventanas de 1/7/30 días — MAU y activeUsers son
      // el mismo número a propósito, no una coincidencia.
      this.countActiveUsersSince(1),
      this.countActiveUsersSince(7),
      this.prisma.course.count(),
      this.prisma.lesson.count(),
      this.prisma.certificate.count(),
      this.prisma.premiumSubscription.count({
        where: {
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.user.findMany({
        where: { createdAt: this.sinceDays(30) },
        select: { createdAt: true },
      }),
      this.prisma.certificate.findMany({
        where: { issuedAt: this.sinceDays(30) },
        select: { issuedAt: true },
      }),
      this.prisma.xPTransaction.findMany({
        where: { createdAt: this.sinceDays(30) },
        select: { amount: true, createdAt: true },
      }),
      this.prisma.activity.findMany({
        take: 12,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
        },
      }),
    ]);

    const retention = await this.computeRetention();

    return {
      cards: {
        totalUsers,
        activeUsers,
        premiumSubscribers,
        courses,
        lessons,
        certificatesIssued,
      },
      // Sección 12/13: DAU/WAU/MAU reales, mismo criterio de "actividad"
      // (Activity o Completion) que ya usaba activeUsers, solo con
      // ventanas de 1/7/30 días.
      engagement: {
        dau: dailyActiveUsers,
        wau: weeklyActiveUsers,
        mau: activeUsers,
        retention,
      },
      charts: {
        newUsersOverTime: this.countByDay(newUsers, 'createdAt'),
        certificatesIssuedOverTime: this.countByDay(certificates, 'issuedAt'),
        xpEarnedOverTime: this.sumByDay(xpTransactions),
      },
      recentActivity: recentActivity.map((activity) => ({
        id: activity.id,
        type: activity.type,
        label: this.formatActivityType(activity.type),
        createdAt: activity.createdAt,
        metadata: activity.metadata,
        user: activity.user,
      })),
    };
  }

  private async countActiveUsersSince(days: number) {
    return this.prisma.user.count({
      where: {
        OR: [
          { activities: { some: { createdAt: this.sinceDays(days) } } },
          { completions: { some: { createdAt: this.sinceDays(days) } } },
        ],
      },
    });
  }

  // Retención real por cohorte de registro, no un placeholder: para cada
  // ventana (D1/D7/D30) toma a los usuarios cuya cuenta ya tiene la
  // antigüedad suficiente para medir ese punto, y calcula qué porcentaje
  // tuvo alguna Activity/Completion en el día objetivo relativo a SU
  // propia fecha de registro (no una fecha calendario fija compartida).
  private async computeRetention() {
    const [d1, d7, d30] = await Promise.all([
      this.retentionForOffset(1),
      this.retentionForOffset(7),
      this.retentionForOffset(30),
    ]);
    return { d1, d7, d30 };
  }

  private async retentionForOffset(offsetDays: number) {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    // Cohorte: usuarios registrados hace entre [offset, offset + 14 días] —
    // suficientemente vieja para que el día objetivo ya haya pasado, pero
    // acotada para no diluir la métrica con toda la historia del producto.
    const cohortEnd = new Date(now - offsetDays * dayMs);
    const cohortStart = new Date(now - (offsetDays + 14) * dayMs);

    const cohort = await this.prisma.user.findMany({
      where: { createdAt: { gte: cohortStart, lte: cohortEnd } },
      select: { id: true, createdAt: true },
    });
    if (cohort.length === 0)
      return { eligible: 0, retained: 0, ratePercent: 0 };

    const userIds = cohort.map((user) => user.id);
    const windowFloor = new Date(cohortStart.getTime());

    const [activities, completions] = await Promise.all([
      this.prisma.activity.findMany({
        where: { userId: { in: userIds }, createdAt: { gte: windowFloor } },
        select: { userId: true, createdAt: true },
      }),
      this.prisma.completion.findMany({
        where: { userId: { in: userIds }, createdAt: { gte: windowFloor } },
        select: { userId: true, createdAt: true },
      }),
    ]);

    const activityDatesByUser = new Map<string, Date[]>();
    for (const row of [...activities, ...completions]) {
      const list = activityDatesByUser.get(row.userId) ?? [];
      list.push(row.createdAt);
      activityDatesByUser.set(row.userId, list);
    }

    let retained = 0;
    for (const user of cohort) {
      const targetDayStart = user.createdAt.getTime() + offsetDays * dayMs;
      const targetDayEnd = targetDayStart + dayMs;
      const dates = activityDatesByUser.get(user.id) ?? [];
      const wasActiveOnTargetDay = dates.some((date) => {
        const t = date.getTime();
        return t >= targetDayStart && t < targetDayEnd;
      });
      if (wasActiveOnTargetDay) retained += 1;
    }

    return {
      eligible: cohort.length,
      retained,
      ratePercent: Math.round((retained / cohort.length) * 100),
    };
  }

  private sinceDays(days: number): Prisma.DateTimeFilter {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return { gte: date };
  }

  private countByDay<T extends Record<K, Date>, K extends keyof T>(
    rows: T[],
    dateKey: K,
  ): ChartPoint[] {
    const points = this.emptyLastSevenDays();
    rows.forEach((row) => {
      const label = this.dayLabel(row[dateKey]);
      points.set(label, (points.get(label) ?? 0) + 1);
    });
    return Array.from(points, ([label, value]) => ({ label, value }));
  }

  private sumByDay(
    rows: Array<{ amount: number; createdAt: Date }>,
  ): ChartPoint[] {
    const points = this.emptyLastSevenDays();
    rows.forEach((row) => {
      const label = this.dayLabel(row.createdAt);
      points.set(label, (points.get(label) ?? 0) + row.amount);
    });
    return Array.from(points, ([label, value]) => ({ label, value }));
  }

  private emptyLastSevenDays() {
    const points = new Map<string, number>();
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      points.set(this.dayLabel(date), 0);
    }
    return points;
  }

  private dayLabel(date: Date) {
    return date.toISOString().slice(5, 10);
  }

  private formatActivityType(type: ActivityType) {
    return type
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
