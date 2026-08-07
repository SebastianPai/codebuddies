import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';

type LeaderboardMetric =
  | 'experience'
  | 'coins'
  | 'streak'
  | 'certificates'
  | 'coinsSpent';

// HI12/PERF4: los top-10 (y las community-stats) son iguales para
// cualquier visitante — solo el "currentUserRank" varía por usuario, así
// que eso se calcula siempre fresco por fuera del cache. TTL corto porque
// XP/coins cambian todo el rato; no vale la pena invalidar por escritura
// en cada progress/exercise submit.
const BOARDS_CACHE_KEY = 'rankings:boards';
const COMMUNITY_STATS_CACHE_KEY = 'rankings:community-stats';
const CACHE_TTL_SECONDS = 30;

@Injectable()
export class RankingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getRankings(currentUserId?: string) {
    const [topXp, topCoins, topStreaks, topCertificates, topCoinsSpent] =
      await this.cacheService.getOrSet(BOARDS_CACHE_KEY, CACHE_TTL_SECONDS, () =>
        Promise.all([
          this.topUsersByField('experience'),
          this.topUsersByField('coins'),
          this.topUsersByField('streak'),
          this.topUsersByRelation('certificates'),
          this.topCoinsSpent(),
        ]),
      );

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
    return this.cacheService.getOrSet(COMMUNITY_STATS_CACHE_KEY, CACHE_TTL_SECONDS, async () => {
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
    });
  }

  private async topUsersByField(field: 'experience' | 'coins' | 'streak') {
    const users = await this.prisma.user.findMany({
      take: 10,
      orderBy: { [field]: 'desc' },
      select: {
        id: true,
        username: true,
        experience: true,
        coins: true,
        streak: true,
      },
    });

    return users.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      username: user.username,
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
        _count: { select: { certificates: true } },
      },
    });

    return users.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      username: user.username,
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
      select: { id: true, username: true },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    return grouped.map((row, index) => {
      const user = usersById.get(row.userId);
      return {
        rank: index + 1,
        userId: row.userId,
        username: user?.username ?? 'Unknown',
        value: Math.abs(row._sum.amount ?? 0),
      };
    });
  }

  private async withCurrentUserRank(
    entries: Array<{
      rank: number;
      userId: string;
      username: string;
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
