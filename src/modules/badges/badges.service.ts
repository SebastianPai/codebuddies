import { Injectable } from '@nestjs/common';
import { BadgeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type BadgeStatus = { verified: boolean; isCreator: boolean };

@Injectable()
export class BadgesService {
  constructor(private readonly prisma: PrismaService) {}

  // { VERIFIED: { iconUrl }, CREATOR: { iconUrl } } — iconUrl null significa
  // "usa el ícono por defecto", el cliente decide cuál lucide-icon mostrar.
  async getConfig() {
    const rows = await this.prisma.badgeConfig.findMany();
    const byType = new Map(rows.map((row) => [row.type, row]));

    return {
      VERIFIED: { iconUrl: byType.get(BadgeType.VERIFIED)?.iconUrl ?? null },
      CREATOR: { iconUrl: byType.get(BadgeType.CREATOR)?.iconUrl ?? null },
    };
  }

  async setConfig(type: BadgeType, iconUrl: string | null) {
    await this.prisma.badgeConfig.upsert({
      where: { type },
      update: { iconUrl },
      create: { type, iconUrl },
    });

    return this.getConfig();
  }

  async getUserBadges(userId: string): Promise<BadgeStatus> {
    const creatorProfile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: {
        verified: true,
        _count: { select: { contents: { where: { status: 'PUBLISHED' } } } },
      },
    });

    if (!creatorProfile) return { verified: false, isCreator: false };

    return {
      verified: creatorProfile.verified,
      isCreator: creatorProfile._count.contents > 0,
    };
  }

  async getUserBadgesByUsername(username: string): Promise<BadgeStatus> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) return { verified: false, isCreator: false };

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
        username: true,
        creatorProfile: {
          select: {
            verified: true,
            _count: { select: { contents: { where: { status: 'PUBLISHED' } } } },
          },
        },
      },
    });

    const result: Record<string, BadgeStatus> = {};
    for (const username of uniqueUsernames) result[username] = { verified: false, isCreator: false };

    for (const user of users) {
      result[user.username] = user.creatorProfile
        ? {
            verified: user.creatorProfile.verified,
            isCreator: user.creatorProfile._count.contents > 0,
          }
        : { verified: false, isCreator: false };
    }

    return result;
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
