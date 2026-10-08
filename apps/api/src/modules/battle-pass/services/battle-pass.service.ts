import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BadgeAnimationDirection,
  BadgeIconMode,
  BadgeType,
  BattlePassProgressMode,
  BattlePassSeasonStatus,
  Prisma,
  RewardSourceType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PREMIUM_LOGO_BADGE_ID } from '../../badges/badges.constants';
import { GamificationService, RewardConfig } from '../../gamification/gamification.service';
import { PremiumAccessService } from '../../premium-access/premium-access.service';
import {
  CreateMonthlySeasonDto,
  UpsertBattlePassSeasonDto,
} from '../dto/upsert-battle-pass-season.dto';
import {
  currentColombiaMonth,
  monthBounds,
  monthlySeasonName,
} from './battle-pass-seasons';
import { UpsertBattlePassTierDto } from '../dto/upsert-battle-pass-tier.dto';

// Mismo criterio que PrismaExecutor en PremiumAccessService: permite que
// awardXp se llame tanto suelto (this.prisma) como compuesto dentro de una
// transacción ya abierta por el caller (ver ProgressService), sin duplicar
// el write del progreso de Battle Pass en dos transacciones separadas.
type PrismaExecutor = PrismaService | Prisma.TransactionClient;

// El "día" del pase diario se corta a medianoche de Colombia (UTC-5, sin
// horario de verano), no a medianoche UTC (las 7 p. m. allá).
const DAY_OFFSET_MS = -5 * 60 * 60 * 1000;

function todayKey(now = Date.now()): string {
  return new Date(now + DAY_OFFSET_MS).toISOString().slice(0, 10);
}

// Tipos de premio que apuntan a un Item del catálogo (ropa, muebles,
// efectos de nombre, burbujas de chat...).
const ITEM_REWARD_TYPES = new Set<string>(['ITEM', 'AVATAR_ITEM', 'FURNITURE']);
const BUBBLE_PREFIX = 'bubble:';

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
    if (!season || season.progressMode === BattlePassProgressMode.DAILY) return;

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

  // Modo DAILY: el primer check-in de cada día (hora de Colombia) sube un
  // nivel. Se llama al abrir el juego y al ver el pase; repetirlo el mismo
  // día no hace nada. Los updateMany condicionales son la guarda contra dos
  // llamadas simultáneas (solo una encuentra lastCheckInDay < hoy).
  //
  // Devuelve true si esta llamada desbloqueó un día nuevo (para que la web
  // muestre el aviso de "recompensa nueva" solo cuando corresponde).
  async checkIn(userId: string): Promise<boolean> {
    const season = await this.getActiveSeason();
    if (!season || season.progressMode !== BattlePassProgressMode.DAILY) return false;

    const today = todayKey();
    const existing = await this.prisma.userBattlePassProgress.upsert({
      where: { userId_seasonId: { userId, seasonId: season.id } },
      update: {},
      // Primer día de la temporada para este usuario = día 1 ya desbloqueado
      // (queda como recompensa reclamable, así que el hub igual lo avisa).
      create: { userId, seasonId: season.id, lastCheckInDay: today },
    });
    if (existing.lastCheckInDay === today) return false;

    const advanced = await this.prisma.userBattlePassProgress.updateMany({
      where: { id: existing.id, lastCheckInDay: { lt: today }, level: { lt: season.totalLevels } },
      data: { lastCheckInDay: today, level: { increment: 1 } },
    });
    if (advanced.count > 0) return true;

    // Sin fila previa de check-in (progreso de la época XP) o ya en el
    // último día: solo marca hoy.
    await this.prisma.userBattlePassProgress.updateMany({
      where: { id: existing.id, OR: [{ lastCheckInDay: null }, { lastCheckInDay: { lt: today } }] },
      data: { lastCheckInDay: today },
    });
    return false;
  }

  // Resumen liviano para el hub de recompensas de la web (burbuja al iniciar
  // sesión): cuenta el día, y junta lo reclamable del pase + la racha. La
  // web lo pide una vez por sesión, así que evita el payload completo.
  async getHub(userId: string) {
    await this.rotateSeasonsIfDue();
    const unlockedToday = await this.checkIn(userId);
    const [state, streak] = await Promise.all([
      this.getMyState(userId, { skipCheckIn: true }),
      this.gamificationService.getStreakRewards(userId),
    ]);

    const battlePass =
      state.season && state.progress
        ? {
            seasonName: state.season.name,
            endsAt: state.season.endsAt,
            mode: state.progress.mode,
            level: state.progress.level,
            totalLevels: state.progress.totalLevels,
            isMaxLevel: state.progress.isMaxLevel,
            hasPremium: state.hasPremium,
            claimable: state.tiers.filter((tier) => tier.claimable),
            // Lo que se desbloquea al siguiente nivel/día (para el "mañana").
            next: state.tiers.filter(
              (tier) => tier.level === state.progress!.level + 1,
            ),
            // Premium visible aunque no se tenga: es el gancho para suscribirse.
            lockedPremium: state.hasPremium
              ? 0
              : state.tiers.filter(
                  (tier) => tier.track === 'PREMIUM' && tier.levelReached && !tier.claimed,
                ).length,
          }
        : null;

    return {
      unlockedToday,
      battlePass,
      streak,
      claimableCount:
        (battlePass?.claimable.length ?? 0) +
        streak.milestones.filter((m) => m.status === 'CLAIMABLE').length,
    };
  }

  async getMyState(userId: string, options: { skipCheckIn?: boolean } = {}) {
    await this.rotateSeasonsIfDue();
    if (!options.skipCheckIn) await this.checkIn(userId);

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

    // El logo Premium se muestra en su ticket tal como sale junto al nombre
    // (mismo ícono/sprite que sube el admin en /admin/badges).
    const premiumLogo = tiers.some((tier) => tier.itemId === PREMIUM_LOGO_BADGE_ID)
      ? await this.prisma.badgeConfig.findUnique({
          where: { type: BadgeType.PREMIUM },
          select: { iconUrl: true, mode: true, size: true, frameCount: true, direction: true, frameRate: true },
        })
      : null;
    // Sin fila de config todavía = ícono por defecto (el cliente dibuja la
    // corona), pero igual marca el ticket como "logo Premium".
    const premiumLogoIcon = premiumLogo ?? {
      iconUrl: null,
      mode: BadgeIconMode.STATIC,
      size: 16,
      frameCount: 6,
      direction: BadgeAnimationDirection.PINGPONG,
      frameRate: 10,
    };

    const itemIds = tiers
      .filter((tier) => ITEM_REWARD_TYPES.has(tier.rewardType) && tier.itemId)
      .map((tier) => tier.itemId!);
    const items = itemIds.length
      ? await this.prisma.item.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, imageUrl: true, type: true, effectKey: true, rarity: true },
        })
      : [];
    const itemById = new Map(items.map((item) => [item.id, item]));

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
        badgeIcon: tier.itemId === PREMIUM_LOGO_BADGE_ID ? premiumLogoIcon : null,
        item: tier.itemId ? (itemById.get(tier.itemId) ?? null) : null,
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
        mode: season.progressMode,
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


  // ---- Temporadas mensuales -------------------------------------------------

  private lastRotationCheck = 0;

  // Barato y frecuente (se llama al leer el pase): como mucho una vez cada
  // 5 minutos por proceso. El cron diario (BattlePassJobsService) es la
  // garantía; esto solo evita esperar al cron justo al cambiar de mes.
  async rotateSeasonsIfDue() {
    const now = Date.now();
    if (now - this.lastRotationCheck < 5 * 60 * 1000) return;
    this.lastRotationCheck = now;
    await this.rotateSeasons().catch(() => undefined);
  }

  // 1) Cierra la temporada activa si ya terminó. 2) Activa la programada
  // cuyo rango incluye hoy. 3) Si no hay ninguna y la última era mensual,
  // crea la del mes actual copiando sus premios — así el pase arranca solo
  // cada día 1 aunque nadie entre al admin.
  async rotateSeasons() {
    const now = new Date();
    await this.prisma.battlePassSeason.updateMany({
      where: { status: BattlePassSeasonStatus.ACTIVE, endsAt: { lte: now } },
      data: { status: BattlePassSeasonStatus.ENDED },
    });

    const active = await this.getActiveSeason();
    if (active) return active;

    const due = await this.prisma.battlePassSeason.findFirst({
      where: {
        status: BattlePassSeasonStatus.UPCOMING,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: { startsAt: 'asc' },
    });
    if (due) {
      return this.prisma.battlePassSeason.update({
        where: { id: due.id },
        data: { status: BattlePassSeasonStatus.ACTIVE },
      });
    }

    const previous = await this.prisma.battlePassSeason.findFirst({
      orderBy: { endsAt: 'desc' },
    });
    if (!previous || previous.progressMode !== BattlePassProgressMode.DAILY) return null;

    const { year, month } = currentColombiaMonth();
    return this.createMonthlySeason({
      year,
      month,
      copyTiersFromSeasonId: previous.id,
      activateNow: true,
    });
  }

  async createMonthlySeason(dto: CreateMonthlySeasonDto) {
    const { startsAt, endsAt, days } = monthBounds(dto.year, dto.month);

    const overlapping = await this.prisma.battlePassSeason.findFirst({
      where: {
        status: { not: BattlePassSeasonStatus.ENDED },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (overlapping) {
      throw new BadRequestException(
        `Ya existe una temporada en ese mes: "${overlapping.name}". Edita sus fechas o termínala primero.`,
      );
    }

    const last = await this.prisma.battlePassSeason.findFirst({
      orderBy: { seasonNumber: 'desc' },
      select: { seasonNumber: true },
    });
    const seasonNumber = (last?.seasonNumber ?? 0) + 1;
    const now = new Date();
    const isCurrent = startsAt <= now && now < endsAt;
    const activate = Boolean(dto.activateNow) && isCurrent;
    if (activate) await this.deactivateOtherActiveSeasons();

    const template = dto.copyTiersFromSeasonId
      ? await this.prisma.battlePassTier.findMany({
          where: { seasonId: dto.copyTiersFromSeasonId, level: { lte: days } },
          orderBy: TIER_ORDER,
        })
      : [];

    return this.prisma.battlePassSeason.create({
      data: {
        name: dto.name?.trim() || `Temporada ${seasonNumber}: ${monthlySeasonName(dto.year, dto.month)}`,
        description: dto.description ?? null,
        seasonNumber,
        status: activate ? BattlePassSeasonStatus.ACTIVE : BattlePassSeasonStatus.UPCOMING,
        startsAt,
        endsAt,
        totalLevels: days,
        xpPerLevel: 1000,
        progressMode: BattlePassProgressMode.DAILY,
        tiers: {
          create: template.map((tier) => ({
            level: tier.level,
            track: tier.track,
            rewardType: tier.rewardType,
            amount: tier.amount,
            itemId: tier.itemId,
            label: tier.label,
            sortOrder: tier.sortOrder,
          })),
        },
      },
      include: { _count: { select: { tiers: true } } },
    });
  }

  // Catálogo para el selector de premios del admin: objetos agrupados por lo
  // que son para el jugador (nombre personalizado, burbuja de chat, ropa,
  // muebles), más insignias y títulos.
  async getRewardCatalog() {
    const [items, badges, titles] = await Promise.all([
      this.prisma.item.findMany({
        select: {
          id: true,
          imageUrl: true,
          type: true,
          effectKey: true,
          category: true,
          rarity: true,
          translations: { select: { name: true, language: { select: { code: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
      this.prisma.gamificationBadge.findMany({
        where: { active: true },
        select: { id: true, name: true, icon: true, rarity: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.gamificationTitle.findMany({
        where: { active: true },
        select: { id: true, name: true, rarity: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const itemName = (item: (typeof items)[number]) =>
      item.translations.find((t) => t.language.code === 'es')?.name ??
      item.translations[0]?.name ??
      item.effectKey ??
      item.id.slice(0, 8);

    const group = (item: (typeof items)[number]) => {
      if (item.type === 'EFFECT') {
        return item.effectKey?.startsWith(BUBBLE_PREFIX) ? 'CHAT_BUBBLE' : 'NAME_EFFECT';
      }
      if (item.type === 'AVATAR') return 'AVATAR';
      return 'WORLD';
    };

    return {
      items: items.map((item) => ({
        id: item.id,
        name: itemName(item),
        imageUrl: item.imageUrl,
        group: group(item),
        category: item.category,
        rarity: item.rarity,
      })),
      badges,
      titles,
    };
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
        progressMode: dto.progressMode ?? BattlePassProgressMode.DAILY,
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
        progressMode: dto.progressMode,
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
