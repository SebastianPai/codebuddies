import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReferralAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [pending, validated, fraud, rewardsGranted, season] = await Promise.all([
      this.prisma.referral.count({ where: { status: 'PENDING' } }),
      this.prisma.referral.count({ where: { status: 'VALIDATED' } }),
      this.prisma.referral.count({ where: { status: 'FRAUD' } }),
      this.prisma.referralRewardGrant.count({ where: { status: 'GRANTED' } }),
      this.prisma.referralSeason.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startsAt: 'desc' },
      }),
    ]);

    return {
      cards: {
        pending,
        validated,
        fraud,
        rewardsGranted,
      },
      season,
    };
  }

  async listReferrals(params: {
    q?: string;
    status?: string;
    seasonId?: string;
  }) {
    return this.prisma.referral.findMany({
      where: {
        ...(params.status ? { status: params.status as any } : {}),
        ...(params.seasonId ? { seasonId: params.seasonId } : {}),
        ...(params.q
          ? {
              OR: [
                {
                  referrer: {
                    username: {
                      contains: params.q,
                      mode: 'insensitive',
                    },
                  },
                },
                {
                  referred: {
                    username: {
                      contains: params.q,
                      mode: 'insensitive',
                    },
                  },
                },
                {
                  referralCodeUsed: {
                    contains: params.q,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        referrer: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            level: true,
          },
        },
        referred: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            level: true,
            createdAt: true,
          },
        },
        season: true,
        rewardGrants: true,
        fraudLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listFraudLogs() {
    return this.prisma.referralFraudLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        referral: {
          include: {
            referrer: {
              select: {
                username: true,
              },
            },
            referred: {
              select: {
                username: true,
              },
            },
          },
        },
      },
      take: 200,
    });
  }

  listRewardHistory() {
    return this.prisma.referralRewardGrant.findMany({
      orderBy: { grantedAt: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        reward: true,
        item: {
          include: {
            translations: {
              take: 1,
            },
          },
        },
        referral: {
          include: {
            referred: {
              select: {
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      take: 200,
    });
  }

  async exportData() {
    const [referrals, rewards, grants, fraud] = await Promise.all([
      this.listReferrals({}),
      this.prisma.referralReward.findMany({
        include: { item: true, season: true },
      }),
      this.listRewardHistory(),
      this.listFraudLogs(),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      referrals,
      rewards,
      grants,
      fraud,
    };
  }
}
