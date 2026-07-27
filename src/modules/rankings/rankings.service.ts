import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type LeaderboardMetric =
  | 'experience'
  | 'coins'
  | 'streak'
  | 'certificates'
  | 'coinsSpent';

@Injectable()
export class RankingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRankings(currentUserId?: string) {
    const [topXp, topCoins, topStreaks, topCertificates, topCoinsSpent] =
      await Promise.all([
        this.topUsersByField('experience'),
        this.topUsersByField('coins'),
        this.topUsersByField('streak'),
        this.topUsersByRelation('certificates'),
        this.topCoinsSpent(),
      ]);

    return {
      topXp: await this.withCurrentUserRank(topXp, 'experience', currentUserId),
      topCoins: await this.withCurrentUserRank(
        topCoins,
        'coins',
        currentUserId,
      ),
      topStreaks: await this.withCurrentUserRank(
        topStreaks,
        'streak',
        currentUserId,
      ),
      topCertificates: await this.withCurrentUserRank(
        topCertificates,
        'certificates',
        currentUserId,
      ),
      topCoinsSpent: await this.withCurrentUserRank(
        topCoinsSpent,
        'coinsSpent',
        currentUserId,
      ),
    };
  }

  async getCommunityStats() {
    const [users, certificates, xp, topLearners, streakLeaders] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.certificate.count(),
        this.prisma.user.aggregate({ _sum: { experience: true } }),
        this.topUsersByField('experience'),
        this.topUsersByField('streak'),
      ]);

    return {
      users,
      certificatesIssued: certificates,
      totalXpEarned: xp._sum.experience ?? 0,
      topLearners: topLearners.slice(0, 3),
      streakLeaders: streakLeaders.slice(0, 3),
    };
  }

  private async topUsersByField(field: 'experience' | 'coins' | 'streak') {
    const users = await this.prisma.user.findMany({
      take: 10,
      orderBy: { [field]: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        experience: true,
        coins: true,
        streak: true,
      },
    });

    return users.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      username: user.username,
      email: user.email,
      value: user[field],
    }));
  }

  private async topUsersByRelation(relation: 'certificates') {
    const users = await this.prisma.user.findMany({
      take: 10,
      orderBy: { [relation]: { _count: 'desc' } },
      select: {
        id: true,
        username: true,
        email: true,
        _count: { select: { certificates: true } },
      },
    });

    return users.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      username: user.username,
      email: user.email,
      value: user._count.certificates,
    }));
  }

  private async topCoinsSpent() {
    const grouped = await this.prisma.coinTransaction.groupBy({
      by: ['userId'],
      where: { amount: { lt: 0 } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'asc' } },
      take: 10,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((row) => row.userId) } },
      select: { id: true, username: true, email: true },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    return grouped.map((row, index) => {
      const user = usersById.get(row.userId);
      return {
        rank: index + 1,
        userId: row.userId,
        username: user?.username ?? 'Unknown',
        email: user?.email ?? '',
        value: Math.abs(row._sum.amount ?? 0),
      };
    });
  }

  private async withCurrentUserRank(
    entries: Array<{
      rank: number;
      userId: string;
      username: string;
      email: string;
      value: number;
    }>,
    metric: LeaderboardMetric,
    currentUserId?: string,
  ) {
    if (!currentUserId) return { entries, currentUserRank: null };
    const isInTop = entries.some((entry) => entry.userId === currentUserId);
    if (isInTop) return { entries, currentUserRank: null };
    return {
      entries,
      currentUserRank: await this.getRankForUser(currentUserId, metric),
    };
  }

  private async getRankForUser(userId: string, metric: LeaderboardMetric) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        experience: true,
        coins: true,
        streak: true,
        _count: { select: { certificates: true } },
      },
    });
    if (!user) return null;

    if (metric === 'certificates') {
      return (
        (await this.prisma.user.count({
          where: { certificates: { some: {} } },
        })) + 1
      );
    }
    if (metric === 'coinsSpent') return null;

    const field = metric;
    const value = user[field];
    return (
      (await this.prisma.user.count({ where: { [field]: { gt: value } } })) + 1
    );
  }
}
