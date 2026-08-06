import { Injectable, NotFoundException } from '@nestjs/common';
import { ReferralStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ensureReferralProfile, getOrCreateReferralProgramConfig } from '../referral.helpers';
import { ReferralRankingService } from './referral-ranking.service';

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: ReferralRankingService,
  ) {}

  async ensureProfileForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    return ensureReferralProfile(this.prisma, {
      userId: user.id,
      username: user.username,
    });
  }

  async getUserOverview(userId: string) {
    const profile = await this.ensureProfileForUser(userId);
    const [sent, grants, config, leaderboard, rewardTree, incomingReferral, user] = await Promise.all([
      this.prisma.referral.findMany({
        where: { referrerUserId: userId },
        include: {
          referred: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              level: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.referralRewardGrant.findMany({
        where: { userId },
        orderBy: { grantedAt: 'desc' },
        include: {
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
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        take: 20,
      }),
      getOrCreateReferralProgramConfig(this.prisma),
      this.rankingService.getSeasonLeaderboard(),
      this.prisma.referralReward.findMany({
        where: { scope: 'MILESTONE', active: true },
        orderBy: [{ threshold: 'asc' }, { sortOrder: 'asc' }],
        include: {
          item: {
            include: {
              translations: {
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.referral.findUnique({
        where: { referredUserId: userId },
        include: {
          referrer: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          level: true,
          createdAt: true,
          email: true,
        },
      }),
    ]);

    const stats = {
      pending: sent.filter((item) => item.status === ReferralStatus.PENDING).length,
      validated: sent.filter((item) => item.status === ReferralStatus.VALIDATED).length,
      fraud: sent.filter((item) => item.status === ReferralStatus.FRAUD).length,
      revoked: sent.filter((item) => item.status === ReferralStatus.REVOKED).length,
    };

    const nextReward = await this.prisma.referralReward.findFirst({
      where: {
        scope: 'MILESTONE',
        active: true,
        threshold: {
          gt: stats.validated,
        },
      },
      orderBy: [{ threshold: 'asc' }, { sortOrder: 'asc' }],
      include: {
        item: {
          include: {
            translations: {
              take: 1,
            },
          },
        },
      },
    });

    const entries = leaderboard.entries as Array<{ userId: string; [key: string]: unknown }>;
    const currentRank = entries.find((entry) => entry.userId === userId) ?? null;
    const incomingStatus = incomingReferral && user
      ? await this.buildIncomingReferralStatus(user.id, incomingReferral, user, config)
      : null;

    return {
      profile,
      config,
      stats,
      referrals: sent,
      incomingReferral: incomingStatus,
      nextReward,
      rewardTree: rewardTree.map((reward) => ({
        ...reward,
        progressState:
          (reward.threshold ?? 0) <= stats.validated
            ? 'COMPLETED'
            : reward.id === nextReward?.id
              ? 'CURRENT'
              : 'UPCOMING',
        missing: Math.max((reward.threshold ?? 0) - stats.validated, 0),
      })),
      grants,
      leaderboard: {
        season: leaderboard.season,
        currentRank,
        top: entries.slice(0, 10),
      },
    };
  }

  private async buildIncomingReferralStatus(
    userId: string,
    referral: {
      id: string;
      status: ReferralStatus;
      createdAt: Date;
      validatedAt: Date | null;
      referrer: { id: string; username: string; avatarUrl: string | null };
    },
    user: { id: string; level: number; createdAt: Date; email: string },
    config: {
      requiredLevel: number;
      minAccountAgeDays: number;
      requireCompletedCourse: boolean;
      requiredCourseId: string | null;
      requireVerifiedEmail: boolean;
    },
  ) {
    const now = new Date();
    const ageInDays = Math.floor(
      (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const completedCourses = await this.prisma.completion.count({
      where: config.requiredCourseId
        ? {
            userId,
            courseId: config.requiredCourseId,
            lessonId: null,
            exerciseId: null,
          }
        : {
            userId,
            courseId: { not: null },
          },
    });

    const requirements = [
      {
        key: 'minimumLevel',
        label: `Llegar a nivel ${config.requiredLevel}`,
        current: user.level,
        target: config.requiredLevel,
        completed: user.level >= config.requiredLevel,
      },
      {
        key: 'minimumAge',
        label: `Tener ${config.minAccountAgeDays} días de antigüedad`,
        current: ageInDays,
        target: config.minAccountAgeDays,
        completed: ageInDays >= config.minAccountAgeDays,
      },
      {
        key: 'completedCourse',
        label: config.requiredCourseId
          ? 'Completar el curso requerido'
          : 'Completar al menos un curso',
        current: completedCourses,
        target: config.requireCompletedCourse ? 1 : 0,
        completed: config.requireCompletedCourse ? completedCourses > 0 : true,
      },
      {
        key: 'verifiedEmail',
        label: 'Verificar correo',
        current: config.requireVerifiedEmail ? 0 : 1,
        target: 1,
        completed: config.requireVerifiedEmail ? false : true,
      },
    ];

    return {
      id: referral.id,
      status: referral.status,
      referrer: referral.referrer,
      createdAt: referral.createdAt,
      validatedAt: referral.validatedAt,
      requirements,
      missing: requirements.filter((item) => !item.completed),
      completed: requirements.every((item) => item.completed),
    };
  }

  getUserHistory(userId: string) {
    return this.prisma.referralRewardGrant.findMany({
      where: { userId },
      orderBy: { grantedAt: 'desc' },
      include: {
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
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }
}
