import { Injectable, NotFoundException } from '@nestjs/common';
import { RankingSeason } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

interface SeasonScore {
  userId: string;
  xpEarned: number;
  coinsEarned: number;
  rank: number;
}

// NF23: el leaderboard general (RankingsService) siempre fue "de siempre"
// (User.experience/coins acumulados, sin reseteo). Una temporada acota una
// ventana [startAt, endAt] y puntúa por XP/monedas GANADOS durante esa
// ventana (sumando XPTransaction/CoinTransaction positivos, no el balance
// neto) — así alguien que gastó monedas en el marketplace no cae en el
// ranking de "quién jugó más" esta temporada.
@Injectable()
export class RankingSeasonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getActiveSeason(): Promise<RankingSeason | null> {
    return this.prisma.rankingSeason.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startAt: 'desc' },
    });
  }

  async listSeasons() {
    return this.prisma.rankingSeason.findMany({ orderBy: { startAt: 'desc' } });
  }

  async getCurrentLeaderboard(take = 20) {
    const season = await this.getActiveSeason();
    if (!season) return { season: null, entries: [] };
    return { season, entries: await this.buildLiveEntries(season, take) };
  }

  async getSeasonDetail(id: string, take = 50) {
    const season = await this.prisma.rankingSeason.findUnique({ where: { id } });
    if (!season) throw new NotFoundException('Temporada no encontrada');

    if (season.status === 'FINALIZED') {
      const entries = await this.prisma.rankingSeasonEntry.findMany({
        where: { seasonId: id },
        orderBy: { rank: 'asc' },
        take,
        include: { user: { select: { id: true, username: true, avatarUrl: true } } },
      });
      return { season, entries };
    }

    return { season, entries: await this.buildLiveEntries(season, take) };
  }

  async createSeason(name: string, startAt?: Date) {
    const start = startAt ?? new Date();
    const active = await this.getActiveSeason();
    if (active) {
      await this.finalizeSeason(active.id, start);
    }
    return this.prisma.rankingSeason.create({
      data: { name, startAt: start, status: 'ACTIVE' },
    });
  }

  async finalizeSeason(id: string, endAt?: Date) {
    const season = await this.prisma.rankingSeason.findUnique({ where: { id } });
    if (!season) throw new NotFoundException('Temporada no encontrada');
    if (season.status === 'FINALIZED') return season;

    const finishAt = endAt ?? new Date();
    const scores = await this.computeSeasonScores(season.startAt, finishAt);

    await this.prisma.$transaction([
      this.prisma.rankingSeasonEntry.deleteMany({ where: { seasonId: id } }),
      ...(scores.length
        ? [
            this.prisma.rankingSeasonEntry.createMany({
              data: scores.map((s) => ({
                seasonId: id,
                userId: s.userId,
                xpEarned: s.xpEarned,
                coinsEarned: s.coinsEarned,
                rank: s.rank,
              })),
            }),
          ]
        : []),
      this.prisma.rankingSeason.update({
        where: { id },
        data: { status: 'FINALIZED', endAt: finishAt },
      }),
    ]);

    await Promise.all(
      scores.slice(0, 3).map((s) =>
        this.notificationsService.create({
          userId: s.userId,
          type: 'RANKING_SEASON_FINALIZED',
          title: `Terminaste #${s.rank} en la temporada "${season.name}"`,
          body: `${s.xpEarned} XP ganados`,
          metadata: { seasonId: id, rank: s.rank },
        }),
      ),
    );

    return this.prisma.rankingSeason.findUnique({ where: { id } });
  }

  async deleteSeason(id: string) {
    const season = await this.prisma.rankingSeason.findUnique({ where: { id } });
    if (!season) throw new NotFoundException('Temporada no encontrada');
    await this.prisma.rankingSeason.delete({ where: { id } });
    return { success: true };
  }

  private async buildLiveEntries(season: RankingSeason, take: number) {
    const scores = (await this.computeSeasonScores(season.startAt, new Date())).slice(0, take);
    const users = await this.prisma.user.findMany({
      where: { id: { in: scores.map((s) => s.userId) } },
      select: { id: true, username: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return scores.map((s) => ({ ...s, user: userMap.get(s.userId) ?? null }));
  }

  private async computeSeasonScores(startAt: Date, endAt: Date): Promise<SeasonScore[]> {
    const [xpSums, coinSums] = await Promise.all([
      this.prisma.xPTransaction.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: startAt, lte: endAt }, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.coinTransaction.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: startAt, lte: endAt }, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
    ]);

    const xpByUser = new Map(xpSums.map((r) => [r.userId, r._sum.amount ?? 0]));
    const coinsByUser = new Map(coinSums.map((r) => [r.userId, r._sum.amount ?? 0]));
    const userIds = new Set([...xpByUser.keys(), ...coinsByUser.keys()]);

    return [...userIds]
      .map((userId) => ({
        userId,
        xpEarned: xpByUser.get(userId) ?? 0,
        coinsEarned: coinsByUser.get(userId) ?? 0,
      }))
      .sort((a, b) => b.xpEarned - a.xpEarned)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }
}
