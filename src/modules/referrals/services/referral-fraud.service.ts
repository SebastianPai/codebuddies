import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, ReferralStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { getOrCreateReferralProgramConfig } from '../referral.helpers';
import { FlagReferralFraudDto } from '../dto/flag-referral-fraud.dto';
import { RewardDispatcherService } from './reward-dispatcher.service';
import { ReferralRankingService } from './referral-ranking.service';

@Injectable()
export class ReferralFraudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardDispatcher: RewardDispatcherService,
    private readonly rankingService: ReferralRankingService,
  ) {}

  async flagFraud(referralId: string, dto: FlagReferralFraudDto) {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        rewardGrants: {
          where: { status: 'GRANTED' },
          select: { id: true },
        },
      },
    });

    if (!referral) {
      throw new NotFoundException('Referido no encontrado');
    }

    const config = await getOrCreateReferralProgramConfig(this.prisma);

    await this.prisma.$transaction(async (tx) => {
      await tx.referral.update({
        where: { id: referralId },
        data: {
          status: ReferralStatus.FRAUD,
          fraudAt: new Date(),
          riskScore: dto.riskScore ?? referral.riskScore,
          fraudSignals: (dto.evidence ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });

      await tx.referralFraudLog.create({
        data: {
          referralId,
          userId: referral.referrerUserId,
          reasonCode: dto.reasonCode,
          notes: dto.notes ?? null,
          riskScore: dto.riskScore ?? null,
          actionTaken: dto.actionTaken ?? 'FLAGGED_AS_FRAUD',
          evidence: (dto.evidence ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });

      if (config.fraudAutoRevoke) {
        for (const grant of referral.rewardGrants) {
          await this.rewardDispatcher.revokeGrantWithClient(
            tx,
            grant.id,
            `fraud:${dto.reasonCode}`,
          );
        }
      }

      await tx.notification.create({
        data: {
          userId: referral.referrerUserId,
          type: NotificationType.REFERRAL_FRAUD_FLAGGED,
          title: 'Referido marcado como fraude',
          body: 'Se detectó una incidencia en uno de tus referidos.',
          metadata: {
            referralId,
            reasonCode: dto.reasonCode,
          } as Prisma.InputJsonValue,
        },
      });
    });

    if (referral.seasonId) {
      await this.rankingService.recalculateSeasonStats(referral.seasonId);
    }

    return this.prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        fraudLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async revokeReferral(referralId: string, reason: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        rewardGrants: {
          where: { status: 'GRANTED' },
          select: { id: true },
        },
      },
    });

    if (!referral) {
      throw new NotFoundException('Referido no encontrado');
    }

    for (const grant of referral.rewardGrants) {
      await this.rewardDispatcher.revokeGrant(grant.id, reason);
    }

    await this.prisma.referral.update({
      where: { id: referralId },
      data: {
        status: ReferralStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    if (referral.seasonId) {
      await this.rankingService.recalculateSeasonStats(referral.seasonId);
    }

    return { success: true };
  }
}
