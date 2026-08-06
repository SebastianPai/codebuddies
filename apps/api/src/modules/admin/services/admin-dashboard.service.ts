import { Injectable } from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type ChartPoint = { label: string; value: number };

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      totalUsers,
      activeUsers,
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
      this.prisma.user.count({
        where: {
          OR: [
            { activities: { some: { createdAt: this.sinceDays(30) } } },
            { completions: { some: { createdAt: this.sinceDays(30) } } },
          ],
        },
      }),
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

    return {
      cards: {
        totalUsers,
        activeUsers,
        courses,
        lessons,
        certificatesIssued,
        premiumSubscribers,
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
