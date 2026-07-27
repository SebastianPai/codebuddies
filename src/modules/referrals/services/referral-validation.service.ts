import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma, ReferralStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { getOrCreateReferralProgramConfig } from '../referral.helpers';
import { ReferralRewardService } from './referral-reward.service';
import { RewardDispatcherService } from './reward-dispatcher.service';
import { ReferralRankingService } from './referral-ranking.service';

@Injectable()
export class ReferralValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardService: ReferralRewardService,
    private readonly rewardDispatcher: RewardDispatcherService,
    private readonly rankingService: ReferralRankingService,
  ) {}

  async evaluateReferral(referralId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        referrer: {
          select: {
            id: true,
            username: true,
          },
        },
        referred: {
          select: {
            id: true,
            username: true,
            level: true,
            createdAt: true,
          },
        },
      },
    });

    if (!referral) return null;

    if (
      referral.status === ReferralStatus.FRAUD ||
      referral.status === ReferralStatus.REVOKED
    ) {
      return referral;
    }

    const config = await getOrCreateReferralProgramConfig(this.prisma);
    const now = new Date();
    const ageInDays =
      (now.getTime() - referral.referred.createdAt.getTime()) /
      (1000 * 60 * 60 * 24);

    const completedCourses = await this.prisma.completion.count({
      where: config.requiredCourseId
        ? {
            userId: referral.referred.id,
            courseId: config.requiredCourseId,
            lessonId: null,
            exerciseId: null,
          }
        : {
            userId: referral.referred.id,
            courseId: { not: null },
          },
    });

    const checks = {
      minimumLevel: referral.referred.level >= config.requiredLevel,
      minimumAge: ageInDays >= config.minAccountAgeDays,
      completedCourse: config.requireCompletedCourse
        ? completedCourses > 0
        : true,
      verifiedEmail: config.requireVerifiedEmail ? false : true,
    };

    const eligible = Object.values(checks).every(Boolean);

    const updated = await this.prisma.referral.update({
      where: { id: referralId },
      data: {
        evaluatedAt: now,
        validationSnapshot: checks as Prisma.InputJsonValue,
        status: eligible ? ReferralStatus.VALIDATED : ReferralStatus.PENDING,
        validatedAt: eligible ? now : null,
      },
    });

    if (!eligible || referral.status === ReferralStatus.VALIDATED) {
      if (updated.seasonId) {
        await this.rankingService.recalculateSeasonStats(updated.seasonId);
      }
      return updated;
    }

    await this.prisma.$transaction(async (tx) => {
      const validatedCount = await tx.referral.count({
        where: {
          referrerUserId: referral.referrer.id,
          status: ReferralStatus.VALIDATED,
        },
      });

      const eligibleRewards =
        await this.rewardService.listEligibleMilestoneRewards(validatedCount);

      for (const reward of eligibleRewards) {
        await this.rewardDispatcher.grantReward(tx, reward, {
          userId: referral.referrer.id,
          referralId: referral.id,
          reason: `validated_referrals:${validatedCount}`,
        });
      }

      await tx.notification.create({
        data: {
          userId: referral.referrer.id,
          type: NotificationType.REFERRAL_VALIDATED,
          title: 'Referido validado',
          body: `${referral.referred.username} ya cuenta como referido válido.`,
          metadata: {
            referralId: referral.id,
          } as Prisma.InputJsonValue,
        },
      });
    });

    if (updated.seasonId) {
      await this.rankingService.recalculateSeasonStats(updated.seasonId);
    }

    return updated;
  }

  async evaluatePendingReferrals() {
    const pending = await this.prisma.referral.findMany({
      where: { status: ReferralStatus.PENDING },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    for (const referral of pending) {
      await this.evaluateReferral(referral.id);
    }

    return pending.length;
  }

  async evaluateReferralsForUser(userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: {
        referredUserId: userId,
        status: {
          in: [ReferralStatus.PENDING, ReferralStatus.VALIDATED],
        },
      },
      select: { id: true },
    });

    for (const referral of referrals) {
      await this.evaluateReferral(referral.id);
    }

    return referrals.length;
  }
}
