import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  ReferralReward,
  ReferralRewardScope,
  ReferralRewardType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaExecutor, RewardDispatchContext } from '../referral.types';

@Injectable()
export class RewardDispatcherService {
  constructor(private readonly prisma: PrismaService) {}

  async grantReward(
    client: PrismaExecutor,
    reward: ReferralReward,
    context: RewardDispatchContext,
  ) {
    const existing = reward.id
      ? await client.referralRewardGrant.findFirst({
          where: {
            userId: context.userId,
            rewardId: reward.id,
            referralId: context.referralId ?? null,
            status: 'GRANTED',
          },
        })
      : null;

    if (existing) {
      return existing;
    }

    await this.applyRewardEffect(client, reward, context.userId);

    const grant = await client.referralRewardGrant.create({
      data: {
        userId: context.userId,
        referralId: context.referralId ?? null,
        rewardId: reward.id,
        itemId: reward.itemId ?? null,
        rewardType: reward.rewardType,
        scope: reward.scope,
        amount: reward.amount ?? null,
        payloadSnapshot: (reward.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        reason: context.reason ?? null,
      },
    });

    await client.notification.create({
      data: {
        userId: context.userId,
        type: NotificationType.REFERRAL_REWARD_UNLOCKED,
        title: 'Nueva recompensa de referidos',
        body: `Desbloqueaste: ${reward.name}`,
        metadata: {
          rewardId: reward.id,
          grantId: grant.id,
        } as Prisma.InputJsonValue,
      },
    });

    return grant;
  }

  async revokeGrant(grantId: string, reason: string) {
    return this.revokeGrantWithClient(this.prisma, grantId, reason);
  }

  async revokeGrantWithClient(
    client: PrismaExecutor,
    grantId: string,
    reason: string,
  ) {
    const grant = await client.referralRewardGrant.findUnique({
      where: { id: grantId },
      include: {
        reward: true,
      },
    });

    if (!grant) {
      throw new NotFoundException('Grant de recompensa no encontrado');
    }

    if (grant.status === 'REVOKED') return grant;

    const reward = grant.reward ?? {
      id: grant.rewardId ?? '',
      seasonId: null,
      name: 'Reward revoked',
      description: null,
      scope: grant.scope,
      rewardType: grant.rewardType,
      threshold: null,
      rankFrom: null,
      rankTo: null,
      amount: grant.amount,
      itemId: grant.itemId,
      payload: grant.payloadSnapshot,
      active: false,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.reverseRewardEffect(client, reward, grant.userId);

    return client.referralRewardGrant.update({
      where: { id: grantId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        reason,
      },
    });
  }

  private async applyRewardEffect(
    client: PrismaExecutor,
    reward: Pick<ReferralReward, 'rewardType' | 'amount' | 'itemId' | 'name'>,
    userId: string,
  ) {
    switch (reward.rewardType) {
      case ReferralRewardType.COINS:
        await client.user.update({
          where: { id: userId },
          data: {
            coins: { increment: reward.amount ?? 0 },
          },
        });
        await client.coinTransaction.create({
          data: {
            userId,
            amount: reward.amount ?? 0,
            reason: `referral_reward:${reward.name}`,
          },
        });
        return;
      case ReferralRewardType.XP:
        await client.user.update({
          where: { id: userId },
          data: {
            experience: { increment: reward.amount ?? 0 },
          },
        });
        await client.xPTransaction.create({
          data: {
            userId,
            amount: reward.amount ?? 0,
            reason: `referral_reward:${reward.name}`,
          },
        });
        return;
      case ReferralRewardType.ITEM:
      case ReferralRewardType.TITLE:
      case ReferralRewardType.BADGE:
      case ReferralRewardType.PET:
        if (!reward.itemId) {
          throw new BadRequestException('La recompensa no tiene itemId');
        }

        await client.userItem.upsert({
          where: {
            userId_itemId: {
              userId,
              itemId: reward.itemId,
            },
          },
          update: {
            amount: { increment: 1 },
          },
          create: {
            userId,
            itemId: reward.itemId,
            amount: 1,
            source: 'referral_reward',
          },
        });
        return;
      case ReferralRewardType.CUSTOM:
        return;
      default:
        return;
    }
  }

  private async reverseRewardEffect(
    client: PrismaExecutor,
    reward: {
      rewardType: ReferralRewardType;
      amount: number | null;
      itemId: string | null;
      name: string;
    },
    userId: string,
  ) {
    switch (reward.rewardType) {
      case ReferralRewardType.COINS:
        await client.user.update({
          where: { id: userId },
          data: {
            coins: { decrement: reward.amount ?? 0 },
          },
        });
        await client.coinTransaction.create({
          data: {
            userId,
            amount: -(reward.amount ?? 0),
            reason: `referral_reward_revoke:${reward.name}`,
          },
        });
        return;
      case ReferralRewardType.XP:
        await client.user.update({
          where: { id: userId },
          data: {
            experience: { decrement: reward.amount ?? 0 },
          },
        });
        await client.xPTransaction.create({
          data: {
            userId,
            amount: -(reward.amount ?? 0),
            reason: `referral_reward_revoke:${reward.name}`,
          },
        });
        return;
      case ReferralRewardType.ITEM:
      case ReferralRewardType.TITLE:
      case ReferralRewardType.BADGE:
      case ReferralRewardType.PET:
        if (!reward.itemId) return;
        const inventoryItem = await client.userItem.findUnique({
          where: {
            userId_itemId: {
              userId,
              itemId: reward.itemId,
            },
          },
        });

        if (!inventoryItem) return;

        if (inventoryItem.amount <= 1) {
          await client.userItem.delete({
            where: {
              userId_itemId: {
                userId,
                itemId: reward.itemId,
              },
            },
          });
        } else {
          await client.userItem.update({
            where: {
              userId_itemId: {
                userId,
                itemId: reward.itemId,
              },
            },
            data: {
              amount: { decrement: 1 },
            },
          });
        }
        return;
      case ReferralRewardType.CUSTOM:
        return;
      default:
        return;
    }
  }
}
