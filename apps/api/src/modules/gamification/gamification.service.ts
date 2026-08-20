import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  GamificationRewardType,
  MissionCadence,
  MissionProgressStatus,
  NotificationType,
  Prisma,
  RewardSourceType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { UpsertAchievementDto } from './dto/upsert-achievement.dto';
import { UpsertCatalogDto } from './dto/upsert-catalog.dto';
import { UpsertMissionDto } from './dto/upsert-mission.dto';
import { UpsertMissionCategoryDto } from './dto/upsert-mission-category.dto';
import { UpsertRewardBundleDto } from './dto/upsert-reward-bundle.dto';

export type RewardConfig = {
  type: GamificationRewardType | string;
  amount?: number;
  itemId?: string;
  label?: string;
  message?: string;
  payload?: Prisma.InputJsonValue;
};

@Injectable()
export class GamificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async getMissionsForUser(userId: string) {
    const missions = await this.prisma.mission.findMany({
      where: {
        active: true,
        visibility: 'VISIBLE',
        OR: [
          { startsAt: null },
          { startsAt: { lte: new Date() } },
        ],
        AND: [
          {
            OR: [
              { endsAt: null },
              { endsAt: { gte: new Date() } },
            ],
          },
        ],
      },
      include: { category: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, level: true, experience: true, coins: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const items = await Promise.all(
      missions.map(async (mission) => {
        const periodKey = this.getPeriodKey(mission.cadence);
        const currentValue = await this.resolveConditionValue(userId, mission.condition);
        const status = this.resolveStatus(
          currentValue,
          mission.requiredValue,
          await this.findExistingProgress(userId, mission.id, periodKey),
        );

        const progress = await this.prisma.userMissionProgress.upsert({
          where: {
            userId_missionId_periodKey: {
              userId,
              missionId: mission.id,
              periodKey,
            },
          },
          update: {
            currentValue,
            targetValue: mission.requiredValue,
            status,
            completedAt: status === 'COMPLETED' ? new Date() : undefined,
          },
          create: {
            userId,
            missionId: mission.id,
            periodKey,
            currentValue,
            targetValue: mission.requiredValue,
            status,
            completedAt: status === 'COMPLETED' ? new Date() : undefined,
          },
        });

        return this.mapMission(mission, progress);
      }),
    );

    const completed = items.filter((item) => item.progress.status === 'COMPLETED' || item.progress.status === 'CLAIMED').length;
    const claimed = items.filter((item) => item.progress.status === 'CLAIMED').length;
    const pending = Math.max(items.length - completed, 0);
    const rewardTotals = await this.getRewardTotals(userId, 'MISSION');

    return {
      summary: {
        total: items.length,
        completed,
        claimed,
        pending,
        xpEarned: rewardTotals.xp,
        coinsEarned: rewardTotals.coins,
        objectsEarned: rewardTotals.objects,
        level: user.level,
      },
      items,
    };
  }

  async claimMission(userId: string, missionId: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission || !mission.active) throw new NotFoundException('Mission not found');

    const periodKey = this.getPeriodKey(mission.cadence);
    const currentValue = await this.resolveConditionValue(userId, mission.condition);
    if (currentValue < mission.requiredValue) {
      throw new BadRequestException('Mission is not completed yet');
    }

    const existing = await this.findExistingProgress(userId, mission.id, periodKey);
    if (existing?.status === 'CLAIMED') {
      throw new BadRequestException('Mission reward already claimed');
    }

    const { progress, granted, notification } = await this.prisma.$transaction(async (tx) => {
      const progress = await tx.userMissionProgress.upsert({
        where: {
          userId_missionId_periodKey: {
            userId,
            missionId: mission.id,
            periodKey,
          },
        },
        update: {
          currentValue,
          targetValue: mission.requiredValue,
          status: 'CLAIMED',
          completedAt: existing?.completedAt ?? new Date(),
          claimedAt: new Date(),
        },
        create: {
          userId,
          missionId: mission.id,
          periodKey,
          currentValue,
          targetValue: mission.requiredValue,
          status: 'CLAIMED',
          completedAt: new Date(),
          claimedAt: new Date(),
        },
      });

      const granted = await this.grantRewards(tx, userId, 'MISSION', mission.id, mission.name, mission.rewards);
      const notification = await tx.notification.create({
        data: {
          userId,
          type: NotificationType.MISSION_REWARD_CLAIMED,
          title: 'Recompensa de misión reclamada',
          body: mission.name,
          metadata: {
            category: 'MISSIONS',
            missionId: mission.id,
            link: '/missions',
            rewards: this.summarizeRewards(granted),
          },
        },
      });

      return { progress, granted, notification };
    });

    this.notificationsService.emitCreated(notification);
    return { progress, granted };
  }

  async getAchievementsForUser(userId: string) {
    const achievements = await this.prisma.gamificationAchievement.findMany({
      where: { visible: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const unlocked = await this.prisma.userGamificationAchievement.findMany({
      where: { userId },
    });
    const unlockedById = new Map(unlocked.map((item) => [item.achievementId, item]));

    const items = await Promise.all(
      achievements.map(async (achievement) => {
        const currentValue = await this.resolveConditionValue(userId, achievement.condition);
        let userAchievement = unlockedById.get(achievement.id);

        if (!userAchievement && currentValue >= achievement.requiredValue) {
          userAchievement = await this.unlockAchievement(userId, achievement.id);
          unlockedById.set(achievement.id, userAchievement);
        }

        const percentage = Math.min(Math.round((currentValue / Math.max(achievement.requiredValue, 1)) * 100), 100);
        return {
          ...achievement,
          rewards: this.normalizeRewards(achievement.rewards),
          currentValue,
          percentage,
          unlocked: Boolean(userAchievement),
          unlockedAt: userAchievement?.unlockedAt ?? null,
        };
      }),
    );

    return {
      summary: {
        total: items.length,
        unlocked: items.filter((item) => item.unlocked).length,
        locked: items.filter((item) => !item.unlocked).length,
      },
      items,
    };
  }

  async unlockAchievement(userId: string, achievementId: string) {
    const achievement = await this.prisma.gamificationAchievement.findUnique({
      where: { id: achievementId },
    });
    if (!achievement) throw new NotFoundException('Achievement not found');

    const { unlocked, notification } = await this.prisma.$transaction(async (tx) => {
      const unlocked = await tx.userGamificationAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId } },
        update: {},
        create: { userId, achievementId },
      });

      const granted = await this.grantRewards(tx, userId, 'ACHIEVEMENT', achievement.id, achievement.name, achievement.rewards);
      const notification = await tx.notification.create({
        data: {
          userId,
          type: NotificationType.ACHIEVEMENT_UNLOCKED,
          title: 'Logro desbloqueado',
          body: achievement.name,
          metadata: {
            category: 'ACHIEVEMENTS',
            achievementId: achievement.id,
            link: '/achievements',
            rewards: this.summarizeRewards(granted),
          },
        },
      });

      return { unlocked, notification };
    });

    this.notificationsService.emitCreated(notification);
    return unlocked;
  }

  async getRewardCenter(userId: string, query: { sourceType?: string; rewardType?: string; page?: string; pageSize?: string }) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize ?? 12), 1), 50);
    const where: Prisma.RewardLedgerEntryWhereInput = {
      userId,
      ...(query.sourceType ? { sourceType: query.sourceType as RewardSourceType } : {}),
      ...(query.rewardType ? { rewardType: query.rewardType as GamificationRewardType } : {}),
    };

    const [items, total, summary] = await Promise.all([
      this.prisma.rewardLedgerEntry.findMany({
        where,
        include: { item: { include: { translations: true } } },
        orderBy: { grantedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rewardLedgerEntry.count({ where }),
      this.getRewardTotals(userId),
    ]);

    return { items, total, page, pageSize, summary };
  }

  // NF20/NF25: catálogo de insignias/títulos ya existía en el schema
  // (GamificationBadge/GamificationTitle) pero no tenía "dueño" real —
  // RewardLedgerEntry.itemId es FK estricta a Item (mundo virtual), nunca
  // pudo apuntar acá. UserGamificationBadge/UserGamificationTitle son las
  // tablas de propiedad que faltaban; grantRewards() ya las escribe.
  async getBadgesForUser(userId?: string) {
    const [badges, earned] = await Promise.all([
      this.prisma.gamificationBadge.findMany({
        where: { active: true },
        orderBy: { createdAt: 'asc' },
      }),
      userId
        ? this.prisma.userGamificationBadge.findMany({ where: { userId }, select: { badgeId: true } })
        : Promise.resolve([]),
    ]);

    const earnedIds = new Set(earned.map((e) => e.badgeId));

    return badges.map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      rarity: badge.rarity,
      earned: earnedIds.has(badge.id),
    }));
  }

  async getTitlesForUser(userId?: string) {
    const [titles, earned] = await Promise.all([
      this.prisma.gamificationTitle.findMany({
        where: { active: true },
        orderBy: { createdAt: 'asc' },
      }),
      userId
        ? this.prisma.userGamificationTitle.findMany({ where: { userId }, select: { titleId: true } })
        : Promise.resolve([]),
    ]);

    const earnedIds = new Set(earned.map((e) => e.titleId));

    return titles.map((title) => ({
      id: title.id,
      name: title.name,
      description: title.description,
      rarity: title.rarity,
      earned: earnedIds.has(title.id),
    }));
  }

  async getAdminDashboard() {
    const [
      activeMissions,
      completedMissions,
      claimedMissions,
      achievementsUnlocked,
      usersWithProgress,
      rewardsDelivered,
      coinsDelivered,
      xpDelivered,
      itemsDelivered,
      furnitureDelivered,
      petsDelivered,
      referrals,
      validatedReferrals,
    ] = await Promise.all([
      this.prisma.mission.count({ where: { active: true } }),
      this.prisma.userMissionProgress.count({ where: { status: 'COMPLETED' } }),
      this.prisma.userMissionProgress.count({ where: { status: 'CLAIMED' } }),
      this.prisma.userGamificationAchievement.count(),
      this.prisma.userMissionProgress.groupBy({ by: ['userId'] }),
      this.prisma.rewardLedgerEntry.count(),
      this.sumRewards('COINS'),
      this.sumRewards('XP'),
      this.prisma.rewardLedgerEntry.count({ where: { rewardType: 'ITEM' } }),
      this.prisma.rewardLedgerEntry.count({ where: { rewardType: 'FURNITURE' } }),
      this.prisma.rewardLedgerEntry.count({ where: { rewardType: 'PET' } }),
      this.prisma.referral.count(),
      this.prisma.referral.count({ where: { status: 'VALIDATED' } }),
    ]);

    return {
      activeMissions,
      completedMissions,
      claimedMissions,
      achievementsUnlocked,
      usersWithProgress: usersWithProgress.length,
      referrals,
      conversion: referrals ? Math.round((validatedReferrals / referrals) * 100) : 0,
      rewardsDelivered,
      coinsDelivered,
      xpDelivered,
      itemsDelivered,
      furnitureDelivered,
      petsDelivered,
    };
  }

  listAdminRewardHistory() {
    return this.prisma.rewardLedgerEntry.findMany({
      include: {
        user: { select: { id: true, username: true, email: true, avatarUrl: true } },
        item: { include: { translations: { take: 1 } } },
      },
      orderBy: { grantedAt: 'desc' },
      take: 100,
    });
  }

  listCategories() {
    return this.prisma.missionCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  createCategory(dto: UpsertMissionCategoryDto) {
    return this.prisma.missionCategory.create({ data: this.categoryData(dto) });
  }

  updateCategory(id: string, dto: UpsertMissionCategoryDto) {
    return this.prisma.missionCategory.update({ where: { id }, data: this.categoryData(dto) });
  }

  deleteCategory(id: string) {
    return this.prisma.missionCategory.delete({ where: { id } });
  }

  listMissions() {
    return this.prisma.mission.findMany({
      include: { category: true, _count: { select: { progress: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  getMission(id: string) {
    return this.prisma.mission.findUniqueOrThrow({
      where: { id },
      include: { category: true },
    });
  }

  async createMission(dto: UpsertMissionDto) {
    const mission = await this.prisma.mission.create({ data: await this.missionData(dto) });
    if (dto.notifyUsers) {
      await this.notifyUsersAboutMission(mission.id, mission.name);
    }
    return mission;
  }

  async updateMission(id: string, dto: UpsertMissionDto) {
    return this.prisma.mission.update({ where: { id }, data: await this.missionData(dto) });
  }

  deleteMission(id: string) {
    return this.prisma.mission.delete({ where: { id } });
  }

  listAchievements() {
    return this.prisma.gamificationAchievement.findMany({
      include: { _count: { select: { unlockedBy: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  getAchievement(id: string) {
    return this.prisma.gamificationAchievement.findUniqueOrThrow({
      where: { id },
    });
  }

  createAchievement(dto: UpsertAchievementDto) {
    return this.prisma.gamificationAchievement.create({ data: this.achievementData(dto) });
  }

  updateAchievement(id: string, dto: UpsertAchievementDto) {
    return this.prisma.gamificationAchievement.update({ where: { id }, data: this.achievementData(dto) });
  }

  deleteAchievement(id: string) {
    return this.prisma.gamificationAchievement.delete({ where: { id } });
  }

  async listCatalog(kind: string) {
    return this.catalogDelegate(kind).findMany({ orderBy: { createdAt: 'desc' } });
  }

  listRewardBundles() {
    return this.prisma.rewardBundle.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  createRewardBundle(dto: UpsertRewardBundleDto, createdById?: string) {
    return this.prisma.rewardBundle.create({
      data: {
        name: dto.name,
        description: dto.description,
        rewards: dto.rewards,
        active: dto.active ?? true,
        createdById,
      },
    });
  }

  updateRewardBundle(id: string, dto: UpsertRewardBundleDto) {
    return this.prisma.rewardBundle.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        rewards: dto.rewards,
        active: dto.active ?? true,
      },
    });
  }

  deleteRewardBundle(id: string) {
    return this.prisma.rewardBundle.delete({ where: { id } });
  }

  async createCatalog(kind: string, dto: UpsertCatalogDto) {
    return this.catalogDelegate(kind).create({ data: this.catalogData(kind, dto) });
  }

  async updateCatalog(kind: string, id: string, dto: UpsertCatalogDto) {
    return this.catalogDelegate(kind).update({ where: { id }, data: this.catalogData(kind, dto) });
  }

  async deleteCatalog(kind: string, id: string) {
    return this.catalogDelegate(kind).delete({ where: { id } });
  }

  private async resolveConditionValue(userId: string, condition: string) {
    const normalized = condition.trim().toUpperCase();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        avatarUrl: true,
        email: true,
        level: true,
        experience: true,
        coins: true,
        streak: true,
        createdAt: true,
      },
    });

    if (!user) return 0;

    switch (normalized) {
      case 'COMPLETE_PROFILE':
        return user.avatarUrl && user.email ? 1 : 0;
      case 'VERIFY_EMAIL':
        return 1;
      case 'CHANGE_AVATAR':
      case 'EQUIP_AVATAR':
        return user.avatarUrl ? 1 : 0;
      case 'BUY_FIRST_ITEM':
      case 'BUY_ITEMS':
      case 'BUY_FURNITURE':
      case 'BUY_PET':
        return this.prisma.userItem.count({ where: { userId } });
      case 'CREATE_FIRST_ROOM':
        return this.prisma.room.count({ where: { ownerId: userId } });
      case 'VISIT_ROOMS':
      case 'JOIN_ROOMS':
        return this.prisma.roomUser.count({ where: { userId } });
      case 'ADD_FRIENDS':
      case 'ACCEPT_FRIENDS':
        return this.prisma.friendship.count({
          where: {
            OR: [{ requesterId: userId }, { addresseeId: userId }],
            status: 'ACCEPTED',
          },
        });
      case 'COMPLETE_LESSONS':
        return this.prisma.completion.count({ where: { userId, lessonId: { not: null } } });
      case 'COMPLETE_EXERCISES':
        return this.prisma.completion.count({ where: { userId, exerciseId: { not: null } } });
      case 'COMPLETE_COURSES':
      case 'FIRST_COURSE':
        return this.prisma.completion.count({ where: { userId, courseId: { not: null } } });
      case 'GAIN_XP':
      case 'OBTAIN_EXPERIENCE':
        return user.experience;
      case 'LEVEL_UP':
      case 'REACH_LEVEL':
        return user.level;
      case 'EARN_COINS':
        return user.coins;
      case 'SPEND_COINS':
        return this.prisma.coinTransaction
          .aggregate({ where: { userId, amount: { lt: 0 } }, _sum: { amount: true } })
          .then((result) => Math.abs(result._sum.amount ?? 0));
      case 'REFER_USERS':
        return this.prisma.referral.count({ where: { referrerUserId: userId } });
      case 'VALID_REFERRALS':
      case 'FIRST_REFERRAL':
        return this.prisma.referral.count({ where: { referrerUserId: userId, status: 'VALIDATED' } });
      case 'UNLOCK_ACHIEVEMENTS':
        return this.prisma.userGamificationAchievement.count({ where: { userId } });
      case 'ENTER_RANKING':
        return this.prisma.ranking.count({ where: { userId } });
      case 'CREATE_POSTS':
        return this.prisma.post.count({ where: { userId } });
      case 'LOGIN_DAYS':
      case 'MAINTAIN_STREAK':
      case 'CONNECT_STREAK':
        return user.streak;
      default:
        return this.resolveActivityCount(userId, normalized);
    }
  }

  private resolveActivityCount(userId: string, condition: string) {
    return this.prisma.activity.count({
      where: { userId, type: condition as never },
    });
  }

  private async findExistingProgress(userId: string, missionId: string, periodKey: string) {
    return this.prisma.userMissionProgress.findUnique({
      where: { userId_missionId_periodKey: { userId, missionId, periodKey } },
    });
  }

  private resolveStatus(currentValue: number, targetValue: number, existing: { status: MissionProgressStatus } | null) {
    if (existing?.status === 'CLAIMED') return MissionProgressStatus.CLAIMED;
    if (currentValue >= targetValue) return MissionProgressStatus.COMPLETED;
    if (currentValue > 0) return MissionProgressStatus.IN_PROGRESS;
    return MissionProgressStatus.PENDING;
  }

  private getPeriodKey(cadence: MissionCadence) {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    if (cadence === 'DAILY') return `${year}-${month}-${day}`;
    if (cadence === 'WEEKLY') return `${year}-W${this.getWeek(date)}`;
    if (cadence === 'MONTHLY') return `${year}-${month}`;
    return 'default';
  }

  private getWeek(date: Date) {
    const first = Date.UTC(date.getUTCFullYear(), 0, 1);
    const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return String(Math.ceil(((current - first) / 86400000 + 1) / 7)).padStart(2, '0');
  }

  private mapMission(mission: any, progress: any) {
    const percentage = Math.min(Math.round((progress.currentValue / Math.max(progress.targetValue, 1)) * 100), 100);
    return {
      ...mission,
      rewards: this.normalizeRewards(mission.rewards),
      progress: { ...progress, percentage },
    };
  }

  private normalizeRewards(rewards: unknown): RewardConfig[] {
    if (!Array.isArray(rewards)) return [];
    return rewards.map((reward) => reward as RewardConfig);
  }

  // Público a propósito: es el único punto de entrega de recompensas de
  // todo el juego (coins/XP/items/badges/titles + fila en RewardLedgerEntry
  // para historial/dashboard/fraude), pensado para que otros módulos lo
  // reusen en vez de reimplementar la entrega -- ver BattlePassService,
  // que lo llama al reclamar un tier en vez de tener su propio ledger.
  async grantRewards(
    tx: Prisma.TransactionClient,
    userId: string,
    sourceType: RewardSourceType,
    sourceId: string,
    sourceLabel: string,
    rewards: unknown,
  ) {
    const normalized = this.normalizeRewards(rewards);
    const granted: Array<Awaited<ReturnType<Prisma.TransactionClient['rewardLedgerEntry']['create']>>> = [];

    for (const reward of normalized) {
      const rewardType = String(reward.type).toUpperCase() as GamificationRewardType;
      const amount = Number(reward.amount ?? 0);
      const label = reward.label ?? this.rewardLabel(rewardType, amount, sourceLabel);

      if (rewardType === 'COINS' && amount > 0) {
        await tx.user.update({ where: { id: userId }, data: { coins: { increment: amount } } });
        await tx.coinTransaction.create({ data: { userId, amount, reason: `${sourceType.toLowerCase()}:${sourceLabel}` } });
      }

      if (rewardType === 'XP' && amount > 0) {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { experience: true } });
        const newExperience = (user?.experience ?? 0) + amount;
        await tx.user.update({
          where: { id: userId },
          data: {
            experience: newExperience,
            level: Math.floor(Math.sqrt(newExperience / 100)) + 1,
          },
        });
        await tx.xPTransaction.create({ data: { userId, amount, reason: `${sourceType.toLowerCase()}:${sourceLabel}` } });
      }

      if ((rewardType === 'ITEM' || rewardType === 'AVATAR_ITEM' || rewardType === 'FURNITURE') && reward.itemId) {
        await tx.userItem.upsert({
          where: { userId_itemId: { userId, itemId: reward.itemId } },
          update: { amount: { increment: amount || 1 } },
          create: { userId, itemId: reward.itemId, amount: amount || 1, source: sourceType.toLowerCase() },
        });
      }

      // BADGE/TITLE no son Item del mundo virtual — RewardLedgerEntry.itemId
      // es FK estricta a Item, así que acá NUNCA va reward.itemId (rompería
      // la constraint). La "propiedad" real vive en UserGamificationBadge /
      // UserGamificationTitle; el ledger solo guarda el itemId original
      // dentro de payload, a fines de historial legible.
      if (rewardType === 'BADGE' && reward.itemId) {
        await tx.userGamificationBadge.upsert({
          where: { userId_badgeId: { userId, badgeId: reward.itemId } },
          update: {},
          create: { userId, badgeId: reward.itemId },
        });
      }

      if (rewardType === 'TITLE' && reward.itemId) {
        await tx.userGamificationTitle.upsert({
          where: { userId_titleId: { userId, titleId: reward.itemId } },
          update: {},
          create: { userId, titleId: reward.itemId },
        });
      }

      const isCatalogReward = rewardType === 'BADGE' || rewardType === 'TITLE';
      const entry = await tx.rewardLedgerEntry.create({
        data: {
          userId,
          sourceType,
          sourceId,
          rewardType,
          amount: amount || null,
          itemId: isCatalogReward ? null : (reward.itemId ?? null),
          label,
          message: reward.message,
          payload: (reward.payload ?? reward) as Prisma.InputJsonValue,
        },
      });
      granted.push(entry);
    }

    return granted;
  }

  private summarizeRewards(
    granted: Array<Awaited<ReturnType<Prisma.TransactionClient['rewardLedgerEntry']['create']>>>,
  ) {
    const xp = granted
      .filter((entry) => entry.rewardType === 'XP')
      .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
    const coins = granted
      .filter((entry) => entry.rewardType === 'COINS')
      .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
    const items = granted
      .filter((entry) => !['XP', 'COINS'].includes(entry.rewardType))
      .map((entry) => ({ label: entry.label, itemId: entry.itemId }));

    return { xp, coins, items };
  }

  private rewardLabel(type: GamificationRewardType, amount: number, sourceLabel: string) {
    if (type === 'COINS') return `${amount} Coins`;
    if (type === 'XP') return `${amount} XP`;
    return sourceLabel;
  }

  private async getRewardTotals(userId: string, sourceType?: RewardSourceType) {
    const where = { userId, ...(sourceType ? { sourceType } : {}) };
    const [coins, xp, objects] = await Promise.all([
      this.prisma.rewardLedgerEntry.aggregate({ where: { ...where, rewardType: 'COINS' }, _sum: { amount: true } }),
      this.prisma.rewardLedgerEntry.aggregate({ where: { ...where, rewardType: 'XP' }, _sum: { amount: true } }),
      this.prisma.rewardLedgerEntry.count({
        where: { ...where, rewardType: { in: ['ITEM', 'AVATAR_ITEM', 'FURNITURE', 'PET', 'BADGE', 'TITLE'] } },
      }),
    ]);

    return {
      coins: coins._sum.amount ?? 0,
      xp: xp._sum.amount ?? 0,
      objects,
    };
  }

  private async sumRewards(type: GamificationRewardType) {
    const result = await this.prisma.rewardLedgerEntry.aggregate({
      where: { rewardType: type },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  private categoryData(dto: UpsertMissionCategoryDto) {
    return {
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      color: dto.color,
      active: dto.active ?? true,
      sortOrder: Number(dto.sortOrder ?? 0),
    };
  }

  private async missionData(dto: UpsertMissionDto) {
    const bundle = dto.rewardBundleId
      ? await this.prisma.rewardBundle.findUnique({ where: { id: dto.rewardBundleId } })
      : null;

    return {
      categoryId: dto.categoryId || null,
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      imageUrl: dto.imageUrl,
      cadence: dto.cadence ?? 'PERMANENT',
      condition: dto.condition,
      requiredValue: Number(dto.requiredValue ?? 1),
      active: dto.active ?? true,
      visibility: dto.visibility ?? 'VISIBLE',
      repeatable: dto.repeatable ?? false,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      sortOrder: Number(dto.sortOrder ?? 0),
      rewards: bundle?.rewards ?? dto.rewards ?? [],
      dependencies: dto.dependencies ?? [],
      metadata: dto.metadata ?? undefined,
    };
  }

  private async notifyUsersAboutMission(missionId: string, missionName: string) {
    const users = await this.prisma.user.findMany({ select: { id: true } });
    if (!users.length) return;

    const createdAt = new Date();
    await this.prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: NotificationType.MISSION_AVAILABLE,
        title: 'Nueva misión disponible',
        body: missionName,
        metadata: {
          category: 'MISIONES',
          priority: 'NORMAL',
          icon: 'Target',
          link: '/missions',
          actionLabel: 'Ver misión',
          missionId,
        },
      })),
    });

    this.realtimeService.emitToAll({
      type: 'notification:new',
      payload: {
        notification: {
          id: `mission-available-${missionId}`,
          type: NotificationType.MISSION_AVAILABLE,
          title: 'Nueva misión disponible',
          body: missionName,
          category: 'MISIONES',
          priority: 'NORMAL',
          icon: 'Target',
          link: '/missions',
          actionLabel: 'Ver misión',
          relativeTime: 'Ahora',
          read: false,
          createdAt,
          readAt: null,
        },
      },
    });
  }

  private achievementData(dto: UpsertAchievementDto) {
    return {
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      imageUrl: dto.imageUrl,
      condition: dto.condition,
      requiredValue: Number(dto.requiredValue ?? 1),
      visible: dto.visible ?? true,
      sortOrder: Number(dto.sortOrder ?? 0),
      rewards: dto.rewards ?? [],
      metadata: dto.metadata ?? undefined,
    };
  }

  private catalogData(kind: string, dto: UpsertCatalogDto) {
    if (kind === 'events') {
      return {
        name: dto.name,
        description: dto.description,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        active: dto.active ?? true,
        metadata: dto.metadata ?? undefined,
      };
    }

    return {
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      imageUrl: dto.imageUrl,
      rarity: dto.rarity,
      active: dto.active ?? true,
    };
  }

  private catalogDelegate(kind: string): any {
    if (kind === 'badges') return this.prisma.gamificationBadge;
    if (kind === 'pets') return this.prisma.gamificationPet;
    if (kind === 'titles') return this.prisma.gamificationTitle;
    if (kind === 'events') return this.prisma.gamificationEvent;
    throw new NotFoundException('Catalog not found');
  }
}
