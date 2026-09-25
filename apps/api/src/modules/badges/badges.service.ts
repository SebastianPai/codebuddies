import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BadgeAnimationDirection,
  BadgeIconMode,
  BadgeType,
  PremiumSubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/services/subscriptions.service';
import { PREMIUM_LOGO_BADGE_ID } from './badges.constants';

export type BadgeStatus = { verified: boolean; isCreator: boolean; premium: boolean };

const NO_BADGES: BadgeStatus = { verified: false, isCreator: false, premium: false };

// Cuántas insignias puede elegir mostrar el jugador a la vez, según su
// nivel de cuenta: gratis solo 1 (tiene que elegir cuál), premium hasta 3,
// admin todas las que quiera.
const FREE_MAX_BADGES = 1;
const PREMIUM_MAX_BADGES = 3;
// No literalmente "infinito" — Infinity no sobrevive un JSON.stringify (se
// vuelve null). Como máximo hay 3 tipos de insignia hoy, así que cualquier
// número por encima de eso ya es "sin límite" en la práctica.
const ADMIN_MAX_BADGES = 99;

// Orden de prioridad para autocompletar la selección de un jugador que
// todavía no eligió nada explícitamente (selectedBadgeTypes vacío).
const BADGE_PRIORITY: BadgeType[] = [BadgeType.VERIFIED, BadgeType.CREATOR, BadgeType.PREMIUM];

type BadgeFacts = { verified: boolean; publishedCount: number; premium: boolean };

const CREATOR_PROFILE_SELECT = {
  verified: true,
  selectedBadgeTypes: true,
  _count: { select: { contents: { where: { status: 'PUBLISHED' as const } } } },
};

function qualifyingBadges(facts: BadgeFacts): BadgeType[] {
  return BADGE_PRIORITY.filter((type) => {
    if (type === BadgeType.VERIFIED) return facts.verified;
    if (type === BadgeType.CREATOR) return facts.publishedCount > 0;
    return facts.premium;
  });
}

function toStatus(visible: BadgeType[]): BadgeStatus {
  return {
    verified: visible.includes(BadgeType.VERIFIED),
    isCreator: visible.includes(BadgeType.CREATOR),
    premium: visible.includes(BadgeType.PREMIUM),
  };
}

export type BadgeIconConfig = {
  iconUrl: string | null;
  mode: BadgeIconMode;
  size: number;
  frameCount: number;
  direction: BadgeAnimationDirection;
  frameRate: number;
};

type SetConfigInput = {
  iconUrl?: string | null;
  mode?: BadgeIconMode;
  size?: number;
  frameCount?: number;
  direction?: BadgeAnimationDirection;
  frameRate?: number;
};

const DEFAULT_ICON_CONFIG: BadgeIconConfig = {
  iconUrl: null,
  mode: BadgeIconMode.STATIC,
  size: 16,
  frameCount: 6,
  direction: BadgeAnimationDirection.PINGPONG,
  frameRate: 10,
};

@Injectable()
export class BadgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async getMaxSelectableBadges(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === 'ADMIN') return ADMIN_MAX_BADGES;

    const premium = await this.subscriptionsService.getActivePremiumSubscription(userId);
    return premium ? PREMIUM_MAX_BADGES : FREE_MAX_BADGES;
  }

  // { VERIFIED: {...}, CREATOR: {...} } — iconUrl null significa "usa el
  // ícono por defecto" (el cliente decide cuál lucide-icon mostrar); mode
  // SPRITE trata iconUrl como una tira horizontal de frameCount cuadros
  // iguales, animada según direction/frameRate.
  async getConfig(): Promise<Record<BadgeType, BadgeIconConfig>> {
    const rows = await this.prisma.badgeConfig.findMany();
    const byType = new Map(rows.map((row) => [row.type, row]));

    const build = (type: BadgeType): BadgeIconConfig => {
      const row = byType.get(type);
      if (!row) return DEFAULT_ICON_CONFIG;

      return {
        iconUrl: row.iconUrl,
        mode: row.mode,
        size: row.size,
        frameCount: row.frameCount,
        direction: row.direction,
        frameRate: row.frameRate,
      };
    };

    return {
      VERIFIED: build(BadgeType.VERIFIED),
      CREATOR: build(BadgeType.CREATOR),
      PREMIUM: build(BadgeType.PREMIUM),
    };
  }

  async setConfig(type: BadgeType, input: SetConfigInput) {
    const data = {
      ...(input.iconUrl !== undefined ? { iconUrl: input.iconUrl } : {}),
      ...(input.mode !== undefined ? { mode: input.mode } : {}),
      ...(input.size !== undefined ? { size: input.size } : {}),
      ...(input.frameCount !== undefined ? { frameCount: input.frameCount } : {}),
      ...(input.direction !== undefined ? { direction: input.direction } : {}),
      ...(input.frameRate !== undefined ? { frameRate: input.frameRate } : {}),
    };

    await this.prisma.badgeConfig.upsert({
      where: { type },
      update: data,
      create: { type, ...data },
    });

    return this.getConfig();
  }

  // Aplica la selección guardada (o la prioridad por defecto si el jugador
  // nunca eligió) sobre las insignias que realmente califica — el límite de
  // cuántas puede elegir ya se validó al guardar la selección, así que acá
  // no hace falta volver a chequear el nivel de cuenta.
  private resolveVisibleBadges(
    qualifying: BadgeType[],
    selected: BadgeType[],
  ): BadgeType[] {
    if (qualifying.length === 0) return [];
    if (selected.length > 0) return selected.filter((type) => qualifying.includes(type));
    return qualifying;
  }

  // Premium activo (misma regla que PremiumAccessService) o el logo ganado
  // en el Battle Pass. Por lotes para las listas (amigos, sala).
  private async premiumUserIds(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const [subscriptions, owned] = await Promise.all([
      this.prisma.premiumSubscription.findMany({
        where: {
          userId: { in: userIds },
          status: PremiumSubscriptionStatus.ACTIVE,
          expiresAt: { gt: new Date() },
        },
        select: { userId: true },
      }),
      this.prisma.userGamificationBadge.findMany({
        where: { userId: { in: userIds }, badgeId: PREMIUM_LOGO_BADGE_ID },
        select: { userId: true },
      }),
    ]);
    return new Set([...subscriptions, ...owned].map((row) => row.userId));
  }

  private async loadBadgeState(userId: string) {
    const [creatorProfile, premiumIds] = await Promise.all([
      this.prisma.creatorProfile.findUnique({
        where: { userId },
        select: CREATOR_PROFILE_SELECT,
      }),
      this.premiumUserIds([userId]),
    ]);
    const qualifying = qualifyingBadges({
      verified: !!creatorProfile?.verified,
      publishedCount: creatorProfile?._count.contents ?? 0,
      premium: premiumIds.has(userId),
    });
    return { creatorProfile, qualifying };
  }

  async getUserBadges(userId: string): Promise<BadgeStatus> {
    const { creatorProfile, qualifying } = await this.loadBadgeState(userId);
    return toStatus(this.resolveVisibleBadges(qualifying, creatorProfile?.selectedBadgeTypes ?? []));
  }

  async getUserBadgesByUsername(username: string): Promise<BadgeStatus> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) return { ...NO_BADGES };

    return this.getUserBadges(user.id);
  }

  // Para listas (amigos, sala) donde conviene resolver varios usernames en
  // una sola pasada en vez de un fetch por fila.
  async getUserBadgesForUsernames(
    usernames: string[],
  ): Promise<Record<string, BadgeStatus>> {
    const uniqueUsernames = [...new Set(usernames)];
    const users = await this.prisma.user.findMany({
      where: { username: { in: uniqueUsernames } },
      select: {
        id: true,
        username: true,
        creatorProfile: { select: CREATOR_PROFILE_SELECT },
      },
    });
    const premiumIds = await this.premiumUserIds(users.map((user) => user.id));

    const result: Record<string, BadgeStatus> = {};
    for (const username of uniqueUsernames) result[username] = { ...NO_BADGES };

    for (const user of users) {
      const qualifying = qualifyingBadges({
        verified: !!user.creatorProfile?.verified,
        publishedCount: user.creatorProfile?._count.contents ?? 0,
        premium: premiumIds.has(user.id),
      });
      result[user.username] = toStatus(
        this.resolveVisibleBadges(qualifying, user.creatorProfile?.selectedBadgeTypes ?? []),
      );
    }

    return result;
  }

  // ---- preferencias del propio jugador ----

  // A diferencia de getUserBadges (que ya filtra por la selección guardada),
  // acá el dueño ve TODO lo que califica más cuáles tiene elegidas y cuántas
  // puede elegir en total, para poder armar la pantalla de Ajustes.
  async getMyBadgeSettings(userId: string) {
    const [{ creatorProfile, qualifying }, maxSelectable] = await Promise.all([
      this.loadBadgeState(userId),
      this.getMaxSelectableBadges(userId),
    ]);
    const selected = this.resolveVisibleBadges(qualifying, creatorProfile?.selectedBadgeTypes ?? []);

    return { qualifying, selected, maxSelectable };
  }

  async setSelectedBadges(userId: string, types: BadgeType[]) {
    const { qualifying, maxSelectable } = await this.getMyBadgeSettings(userId);

    const unique = [...new Set(types)];
    const invalid = unique.filter((type) => !qualifying.includes(type));
    if (invalid.length > 0) {
      throw new BadRequestException('No podés mostrar una insignia que no tenés.');
    }
    if (unique.length > maxSelectable) {
      throw new BadRequestException(`Tu cuenta puede mostrar hasta ${maxSelectable} insignia(s) a la vez.`);
    }

    // updateMany en vez de update: si el jugador todavía no tiene
    // CreatorProfile (nunca publicó nada ni fue verificado), no hay nada
    // que guardar — no debe ser un error.
    await this.prisma.creatorProfile.updateMany({
      where: { userId },
      data: { selectedBadgeTypes: unique },
    });

    return this.getMyBadgeSettings(userId);
  }

  // ---- admin ----

  async adminListCreators() {
    const creators = await this.prisma.creatorProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { contents: { where: { status: 'PUBLISHED' } } } },
      },
    });

    return creators.map((creator) => ({
      userId: creator.user.id,
      username: creator.user.username,
      avatarUrl: creator.user.avatarUrl,
      status: creator.status,
      verified: creator.verified,
      publishedCount: creator._count.contents,
    }));
  }

  async adminSetVerified(userId: string, verified: boolean) {
    const creatorProfile = await this.prisma.creatorProfile.update({
      where: { userId },
      data: { verified },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    });

    return {
      userId: creatorProfile.user.id,
      username: creatorProfile.user.username,
      avatarUrl: creatorProfile.user.avatarUrl,
      verified: creatorProfile.verified,
    };
  }
}
