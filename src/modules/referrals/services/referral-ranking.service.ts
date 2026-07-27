import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  ReferralSeasonStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ensureActiveReferralSeason } from '../referral.helpers';
import { ReferralRewardService } from './referral-reward.service';
import { RewardDispatcherService } from './reward-dispatcher.service';

@Injectable()
export class ReferralRankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referralRewardService: ReferralRewardService,
    private readonly rewardDispatcher: RewardDispatcherService,
  ) {}

  ensureCurrentSeason() {
    return ensureActiveReferralSeason(this.prisma);
  }

  async getSeasonLeaderboard(seasonId?: string) {
    const season =
      seasonId != null
        ? await this.prisma.referralSeason.findUnique({
            where: { id: seasonId },
          })
        : await ensureActiveReferralSeason(this.prisma);

    if (!season) return { season: null, entries: [] };

    await this.recalculateSeasonStats(season.id);

    return this.getSeasonLeaderboardSnapshot(season.id);
  }

  async getSeasonLeaderboardSnapshot(seasonId: string) {
    const season = await this.prisma.referralSeason.findUnique({
      where: { id: seasonId },
    });

    if (!season) return { season: null, entries: [] };

    const entries = await this.prisma.referralSeasonStat.findMany({
      where: { seasonId: season.id },
      orderBy: [{ currentRank: 'asc' }, { validatedReferrals: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            level: true,
          },
        },
      },
      take: 50,
    });

    return { season, entries };
  }

  async recalculateSeasonStats(seasonId: string) {
    const season = await this.prisma.referralSeason.findUnique({
      where: { id: seasonId },
      select: { id: true },
    });

    if (!season) return null;

    const referrals = await this.prisma.referral.findMany({
      where: { seasonId },
      select: {
        referrerUserId: true,
        status: true,
      },
    });

    const statsMap = new Map<
      string,
      { validatedReferrals: number; pendingReferrals: number; fraudReferrals: number }
    >();

    for (const referral of referrals) {
      const current = statsMap.get(referral.referrerUserId) ?? {
        validatedReferrals: 0,
        pendingReferrals: 0,
        fraudReferrals: 0,
      };

      if (referral.status === 'VALIDATED') current.validatedReferrals += 1;
      else if (referral.status === 'FRAUD') current.fraudReferrals += 1;
      else if (referral.status === 'PENDING') current.pendingReferrals += 1;

      statsMap.set(referral.referrerUserId, current);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [userId, values] of statsMap.entries()) {
        await tx.referralSeasonStat.upsert({
          where: {
            seasonId_userId: {
              seasonId,
              userId,
            },
          },
          update: values,
          create: {
            seasonId,
            userId,
            ...values,
          },
        });
      }
    });

    const ordered = await this.prisma.referralSeasonStat.findMany({
      where: { seasonId },
      orderBy: [
        { validatedReferrals: 'desc' },
        { pendingReferrals: 'desc' },
        { updatedAt: 'asc' },
      ],
    });

    await this.prisma.$transaction(
      ordered.map((entry, index) =>
        this.prisma.referralSeasonStat.update({
          where: { id: entry.id },
          data: { currentRank: index + 1 },
        }),
      ),
    );

    return this.getSeasonLeaderboardSnapshot(seasonId);
  }

  async finalizeSeason(seasonId: string) {
    const season = await this.prisma.referralSeason.findUnique({
      where: { id: seasonId },
    });

    if (!season) return null;

    await this.recalculateSeasonStats(seasonId);
    const stats = await this.prisma.referralSeasonStat.findMany({
      where: { seasonId },
      orderBy: [{ currentRank: 'asc' }],
    });
    const rewards = await this.referralRewardService.listSeasonRewards(seasonId);

    await this.prisma.$transaction(async (tx) => {
      for (const stat of stats) {
        await tx.referralSeasonStat.update({
          where: { id: stat.id },
          data: { finalRank: stat.currentRank },
        });

        for (const reward of rewards) {
          if (
            stat.currentRank != null &&
            reward.rankFrom != null &&
            reward.rankTo != null &&
            stat.currentRank >= reward.rankFrom &&
            stat.currentRank <= reward.rankTo
          ) {
            await this.rewardDispatcher.grantReward(tx, reward, {
              userId: stat.userId,
              reason: `season:${season.periodKey}`,
            });
          }
        }

        await tx.notification.create({
          data: {
            userId: stat.userId,
            type: NotificationType.REFERRAL_RANKING_UPDATED,
            title: 'Ranking mensual actualizado',
            body: `Tu posición final fue #${stat.currentRank ?? '-'} en ${season.name}.`,
            metadata: {
              seasonId,
              rank: stat.currentRank,
            } as Prisma.InputJsonValue,
          },
        });
      }

      await tx.referralSeason.update({
        where: { id: seasonId },
        data: {
          status: ReferralSeasonStatus.FINALIZED,
          finalizedAt: new Date(),
        },
      });
    });

    return this.prisma.referralSeason.findUnique({
      where: { id: seasonId },
    });
  }

  async finalizeExpiredSeasons() {
    const expired = await this.prisma.referralSeason.findMany({
      where: {
        status: ReferralSeasonStatus.ACTIVE,
        endsAt: { lt: new Date() },
      },
    });

    for (const season of expired) {
      await this.finalizeSeason(season.id);
    }

    await ensureActiveReferralSeason(this.prisma);

    return expired.length;
  }
}
