import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ReferralRewardScope,
  ReferralRewardType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpsertReferralRewardDto } from '../dto/upsert-referral-reward.dto';

@Injectable()
export class ReferralRewardService {
  constructor(private readonly prisma: PrismaService) {}

  listRewards(scope?: ReferralRewardScope) {
    return this.prisma.referralReward.findMany({
      where: scope ? { scope } : undefined,
      orderBy: [{ scope: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        item: {
          include: {
            translations: {
              take: 1,
            },
          },
        },
        season: true,
      },
    });
  }

  async createReward(dto: UpsertReferralRewardDto) {
    this.validateReward(dto);
    return this.prisma.referralReward.create({
      data: this.mapRewardDto(dto),
      include: {
        item: true,
        season: true,
      },
    });
  }

  async updateReward(id: string, dto: UpsertReferralRewardDto) {
    await this.ensureReward(id);
    this.validateReward(dto, true);
    return this.prisma.referralReward.update({
      where: { id },
      data: this.mapRewardDto(dto),
      include: {
        item: true,
        season: true,
      },
    });
  }

  async deleteReward(id: string) {
    await this.ensureReward(id);
    await this.prisma.referralRewardGrant.updateMany({
      where: { rewardId: id },
      data: { rewardId: null },
    });
    return this.prisma.referralReward.delete({
      where: { id },
    });
  }

  async toggleReward(id: string, active: boolean) {
    await this.ensureReward(id);
    return this.prisma.referralReward.update({
      where: { id },
      data: { active },
    });
  }

  async reorderRewards(items: Array<{ id: string; sortOrder: number }>) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.referralReward.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return this.listRewards();
  }

  async listEligibleMilestoneRewards(validatedCount: number) {
    return this.prisma.referralReward.findMany({
      where: {
        scope: ReferralRewardScope.MILESTONE,
        active: true,
        threshold: {
          lte: validatedCount,
        },
      },
      orderBy: [{ threshold: 'asc' }, { sortOrder: 'asc' }],
      include: {
        item: true,
      },
    });
  }

  async listSeasonRewards(seasonId: string) {
    return this.prisma.referralReward.findMany({
      where: {
        scope: ReferralRewardScope.RANKING,
        seasonId,
        active: true,
      },
      orderBy: [{ rankFrom: 'asc' }, { sortOrder: 'asc' }],
      include: {
        item: true,
      },
    });
  }

  private async ensureReward(id: string) {
    const reward = await this.prisma.referralReward.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!reward) {
      throw new NotFoundException('Recompensa de referido no encontrada');
    }
  }

  private validateReward(dto: UpsertReferralRewardDto, partial = false) {
    const rewardType = dto.rewardType;
    const scope = dto.scope ?? ReferralRewardScope.MILESTONE;

    if (!partial && !dto.name?.trim()) {
      throw new BadRequestException('El nombre es requerido');
    }

    if (scope === ReferralRewardScope.MILESTONE && dto.threshold == null) {
      throw new BadRequestException(
        'Las recompensas por hitos requieren threshold',
      );
    }

    if (
      scope === ReferralRewardScope.RANKING &&
      (dto.rankFrom == null || dto.rankTo == null)
    ) {
      throw new BadRequestException(
        'Las recompensas de ranking requieren rankFrom y rankTo',
      );
    }

    if (
      (rewardType === ReferralRewardType.ITEM ||
        rewardType === ReferralRewardType.TITLE ||
        rewardType === ReferralRewardType.BADGE ||
        rewardType === ReferralRewardType.PET) &&
      !dto.itemId
    ) {
      throw new BadRequestException(
        'Las recompensas basadas en objetos requieren itemId',
      );
    }

    if (
      (rewardType === ReferralRewardType.COINS ||
        rewardType === ReferralRewardType.XP) &&
      (dto.amount == null || dto.amount <= 0)
    ) {
      throw new BadRequestException(
        'Las recompensas de monedas o XP requieren amount > 0',
      );
    }
  }

  private mapRewardDto(dto: UpsertReferralRewardDto): Prisma.ReferralRewardUncheckedCreateInput {
    return {
      name: dto.name,
      description: dto.description ?? null,
      scope: dto.scope ?? ReferralRewardScope.MILESTONE,
      rewardType: dto.rewardType,
      threshold: dto.threshold ?? null,
      rankFrom: dto.rankFrom ?? null,
      rankTo: dto.rankTo ?? null,
      amount: dto.amount ?? null,
      itemId: dto.itemId ?? null,
      payload: (dto.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      active: dto.active ?? true,
      sortOrder: dto.sortOrder ?? 0,
      seasonId: dto.seasonId ?? null,
    };
  }
}
