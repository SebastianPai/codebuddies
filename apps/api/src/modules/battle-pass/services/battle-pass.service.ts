import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BattlePassSeasonStatus, Prisma, RewardSourceType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { GamificationService, RewardConfig } from '../../gamification/gamification.service';
import { PremiumAccessService } from '../../premium-access/premium-access.service';
import { UpsertBattlePassSeasonDto } from '../dto/upsert-battle-pass-season.dto';
import { UpsertBattlePassTierDto } from '../dto/upsert-battle-pass-tier.dto';

// Mismo criterio que PrismaExecutor en PremiumAccessService: permite que
// awardXp se llame tanto suelto (this.prisma) como compuesto dentro de una
// transacción ya abierta por el caller (ver ProgressService), sin duplicar
// el write del progreso de Battle Pass en dos transacciones separadas.
type PrismaExecutor = PrismaService | Prisma.TransactionClient;

const TIER_ORDER: Prisma.BattlePassTierOrderByWithRelationInput[] = [
  { level: 'asc' },
  { track: 'asc' },
  { sortOrder: 'asc' },
];

@Injectable()
export class BattlePassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamificationService: GamificationService,
    private readonly premiumAccessService: PremiumAccessService,
  ) {}

  private getActiveSeason(client: PrismaExecutor = this.prisma) {
    return client.battlePassSeason.findFirst({
      where: { status: BattlePassSeasonStatus.ACTIVE },
      orderBy: { startsAt: 'desc' },
    });
  }

  private levelForXp(xp: number, xpPerLevel: number, totalLevels: number): number {
    return Math.min(Math.floor(xp / xpPerLevel) + 1, totalLevels);
  }

  // Única fuente de acceso al track PREMIUM: CodeBuddies Pro
  // (PremiumAccessService.hasPremiumAccess). No hay forma de comprar el
  // track con coins -- las monedas quedan reservadas para la futura tienda
  // de items/cosmetics, no para competir con la suscripción.
  private hasPremiumTrack(userId: string): Promise<boolean> {
    return this.premiumAccessService.hasPremiumAccess(userId);
  }

  // Suma XP de Battle Pass (independiente de User.experience -- ver
  // comentario en el schema) y recalcula nivel. No hace nada si no hay
  // temporada activa: pensado para llamarse desde puntos de la app que
  // otorgan XP real (lecciones/ejercicios) sin que el Battle Pass sea un
  // requisito duro de esos flujos. `client` opcional para poder componerse
  // dentro de una transacción existente (ver ProgressService).
  async awardXp(userId: string, amount: number, client: PrismaExecutor = this.prisma): Promise<void> {
    if (amount <= 0) return;

    const season = await this.getActiveSeason(client);
    if (!season) return;

    const maxXp = season.xpPerLevel * season.totalLevels;

    const progress = await client.userBattlePassProgress.upsert({
      where: { userId_seasonId: { userId, seasonId: season.id } },
      update: {},
      create: { userId, seasonId: season.id },
    });

    if (progress.xp >= maxXp) return;

    const nextXp = Math.min(progress.xp + amount, maxXp);
    const nextLevel = this.levelForXp(nextXp, season.xpPerLevel, season.totalLevels);

    await client.userBattlePassProgress.update({
      where: { id: progress.id },
      data: { xp: nextXp, level: nextLevel },
    });
  }

  async getMyState(userId: string) {
    const season = await this.getActiveSeason();
    if (!season) {
      return { season: null, hasPremium: false, progress: null, tiers: [] };
    }

    const [progress, hasPremium, tiers, claims] = await Promise.all([
      this.prisma.userBattlePassProgress.findUnique({
        where: { userId_seasonId: { userId, seasonId: season.id } },
      }),
      this.hasPremiumTrack(userId),
      this.prisma.battlePassTier.findMany({
        where: { seasonId: season.id },
        orderBy: TIER_ORDER,
      }),
      this.prisma.battlePassClaim.findMany({
        where: { userId, seasonId: season.id },
        select: { tierId: true },
      }),
    ]);

    const currentLevel = progress?.level ?? 1;
    const currentXp = progress?.xp ?? 0;
    const claimedTierIds = new Set(claims.map((c) => c.tierId));

    const tierPayload = tiers.map((tier) => {
      const trackUnlocked = tier.track === 'FREE' || hasPremium;
      const levelReached = tier.level <= currentLevel;
      const claimed = claimedTierIds.has(tier.id);
      return {
        id: tier.id,
        level: tier.level,
        track: tier.track,
        rewardType: tier.rewardType,
        amount: tier.amount,
        itemId: tier.itemId,
        label: tier.label,
        sortOrder: tier.sortOrder,
        levelReached,
        trackUnlocked,
        claimed,
        claimable: levelReached && trackUnlocked && !claimed,
      };
    });

    const xpForCurrentLevel = (currentLevel - 1) * season.xpPerLevel;
    const xpIntoLevel = Math.max(0, currentXp - xpForCurrentLevel);
    const isMaxLevel = currentLevel >= season.totalLevels;

    return {
      season,
      hasPremium,
      progress: {
        xp: currentXp,
        level: currentLevel,
        xpPerLevel: season.xpPerLevel,
        totalLevels: season.totalLevels,
        xpIntoLevel,
        isMaxLevel,
      },
      tiers: tierPayload,
    };
  }

  // Un claim = un BattlePassClaim (único por [userId, tierId]) más la
  // entrega vía GamificationService.grantRewards (mismo ledger que
  // misiones/logros). El INSERT del claim se intenta primero: si ya existe,
  // Postgres rechaza por la unique constraint y no se entrega nada de
  // nuevo -- esa es la guarda real de idempotencia, no un chequeo previo
  // que pueda perder una carrera.
  async claimTier(userId: string, tierId: string) {
    const tier = await this.prisma.battlePassTier.findUnique({
      where: { id: tierId },
      include: { season: true },
    });
    if (!tier) throw new NotFoundException('Battle pass reward not found');
    if (tier.season.status !== BattlePassSeasonStatus.ACTIVE) {
      throw new BadRequestException('This battle pass season is not active');
    }

    const progress = await this.prisma.userBattlePassProgress.findUnique({
      where: { userId_seasonId: { userId, seasonId: tier.seasonId } },
    });
    const currentLevel = progress?.level ?? 1;
    if (tier.level > currentLevel) {
      throw new ForbiddenException('You have not reached this level yet');
    }

    if (tier.track === 'PREMIUM') {
      const hasPremium = await this.hasPremiumTrack(userId);
      if (!hasPremium) {
        throw new ForbiddenException('Premium track requires an active CodeBuddies Pro subscription');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      try {
        await tx.battlePassClaim.create({
          data: { userId, tierId, seasonId: tier.seasonId },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new BadRequestException('This reward was already claimed');
        }
        throw error;
      }

      const rewardConfig: RewardConfig[] = [
        {
          type: tier.rewardType,
          amount: tier.amount ?? undefined,
          itemId: tier.itemId ?? undefined,
          label: tier.label,
        },
      ];

      const granted = await this.gamificationService.grantRewards(
        tx,
        userId,
        RewardSourceType.BATTLE_PASS,
        tier.id,
        tier.label,
        rewardConfig,
      );

      return { tier, granted };
    });
  }

  // --- Admin ---

  listSeasons() {
    return this.prisma.battlePassSeason.findMany({
      orderBy: { seasonNumber: 'desc' },
      include: { _count: { select: { tiers: true, progress: true } } },
    });
  }

  getSeasonForAdmin(id: string) {
    return this.prisma.battlePassSeason.findUniqueOrThrow({
      where: { id },
      include: { tiers: { orderBy: TIER_ORDER } },
    });
  }

  // Solo una temporada ACTIVE a la vez -- evita que dos temporadas activas
  // simultáneas hagan ambiguo a qué season.id le suma XP awardXp() (que
  // siempre toma la más reciente por startsAt, pero es una garantía mejor
  // no depender de eso).
  private async deactivateOtherActiveSeasons(exceptId?: string) {
    await this.prisma.battlePassSeason.updateMany({
      where: { status: BattlePassSeasonStatus.ACTIVE, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      data: { status: BattlePassSeasonStatus.ENDED },
    });
  }

  async createSeason(dto: UpsertBattlePassSeasonDto) {
    if (!dto.name || dto.seasonNumber === undefined || !dto.startsAt || !dto.endsAt) {
      throw new BadRequestException('name, seasonNumber, startsAt and endsAt are required');
    }
    if (dto.status === BattlePassSeasonStatus.ACTIVE) {
      await this.deactivateOtherActiveSeasons();
    }
    return this.prisma.battlePassSeason.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        seasonNumber: dto.seasonNumber,
        status: dto.status ?? BattlePassSeasonStatus.UPCOMING,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        totalLevels: dto.totalLevels ?? 30,
        xpPerLevel: dto.xpPerLevel ?? 1000,
      },
    });
  }

  async updateSeason(id: string, dto: UpsertBattlePassSeasonDto) {
    if (dto.status === BattlePassSeasonStatus.ACTIVE) {
      await this.deactivateOtherActiveSeasons(id);
    }
    return this.prisma.battlePassSeason.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        seasonNumber: dto.seasonNumber,
        status: dto.status,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        totalLevels: dto.totalLevels,
        xpPerLevel: dto.xpPerLevel,
      },
    });
  }

  async createTier(seasonId: string, dto: UpsertBattlePassTierDto) {
    if (dto.level === undefined || !dto.track || !dto.rewardType || !dto.label) {
      throw new BadRequestException('level, track, rewardType and label are required');
    }
    return this.prisma.battlePassTier.create({
      data: {
        seasonId,
        level: dto.level,
        track: dto.track,
        rewardType: dto.rewardType,
        amount: dto.amount ?? null,
        itemId: dto.itemId ?? null,
        label: dto.label,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  updateTier(id: string, dto: UpsertBattlePassTierDto) {
    return this.prisma.battlePassTier.update({
      where: { id },
      data: {
        level: dto.level,
        track: dto.track,
        rewardType: dto.rewardType,
        amount: dto.amount,
        itemId: dto.itemId,
        label: dto.label,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async deleteTier(id: string) {
    await this.prisma.battlePassTier.delete({ where: { id } });
    return { success: true };
  }
}
