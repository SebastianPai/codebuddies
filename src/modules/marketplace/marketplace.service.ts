import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreatorApplicationStatus,
  CreatorStatus,
  MarketplaceContentStatus,
  MarketplaceContentType,
  MarketplaceReportReason,
  MarketplaceWalletMovementType,
  ItemType,
  WorldItemKind,
  AvatarSlotType,
  PlacementType,
  FurnitureCategory,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type AuthUser = { userId: string; role?: string };

const contentInclude = {
  creator: {
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
  },
  publishedItem: {
    include: { worldData: true, avatarData: true, translations: true },
  },
  _count: { select: { favorites: true, purchases: true, reports: true } },
} satisfies Prisma.MarketplaceContentInclude;

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    return this.prisma.marketplaceSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
  }

  async updateSettings(dto: Record<string, unknown>) {
    const numericFields = [
      'minLevel',
      'minAccountAgeDays',
      'publicationFeeCoins',
      'minPriceCoins',
      'maxPriceCoins',
      'commissionRate',
      'maxPendingItems',
      'maxPublishedItems',
      'maxSubmissionsPerDay',
      'maxSubmissionsPerWeek',
      'rejectionStrikeLimit',
      'suspensionDaysOnStrike',
    ];
    const booleanFields = [
      'requireMinLevel',
      'requireAccountAge',
      'requireEmailVerified',
    ];

    const data: Record<string, unknown> = {};
    for (const field of numericFields) {
      if (dto[field] !== undefined) data[field] = Number(dto[field]);
    }
    for (const field of booleanFields) {
      if (dto[field] !== undefined) data[field] = Boolean(dto[field]);
    }
    if (dto.metadata !== undefined) data.metadata = dto.metadata as Prisma.InputJsonValue;

    return this.prisma.marketplaceSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data } as Prisma.MarketplaceSettingsCreateInput,
      update: data as Prisma.MarketplaceSettingsUpdateInput,
    });
  }

  async getEligibility(userId: string) {
    const [settings, user, existingCreator, latestApplication] =
      await Promise.all([
        this.getSettings(),
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            level: true,
            createdAt: true,
            emailVerified: true,
            coins: true,
          },
        }),
        this.prisma.creatorProfile.findUnique({
          where: { userId },
          include: { wallet: true },
        }),
        this.prisma.creatorApplication.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const accountAgeDays = Math.floor(
      (Date.now() - user.createdAt.getTime()) / 86400000,
    );
    const checks = [
      {
        key: 'MIN_LEVEL',
        enabled: settings.requireMinLevel,
        passed: !settings.requireMinLevel || user.level >= settings.minLevel,
        label: `Nivel minimo ${settings.minLevel}`,
        current: user.level,
        required: settings.minLevel,
      },
      {
        key: 'ACCOUNT_AGE',
        enabled: settings.requireAccountAge,
        passed:
          !settings.requireAccountAge ||
          accountAgeDays >= settings.minAccountAgeDays,
        label: `${settings.minAccountAgeDays} dias desde el registro`,
        current: accountAgeDays,
        required: settings.minAccountAgeDays,
      },
      {
        key: 'EMAIL_VERIFIED',
        enabled: settings.requireEmailVerified,
        passed: !settings.requireEmailVerified || user.emailVerified,
        label: 'Correo verificado',
        current: user.emailVerified ? 1 : 0,
        required: 1,
      },
    ];

    return {
      canApply: !existingCreator && checks.every((check) => check.passed),
      isCreator: Boolean(existingCreator),
      creator: existingCreator,
      latestApplication,
      settings,
      checks,
    };
  }

  async applyToBecomeCreator(userId: string, message?: string) {
    const eligibility = await this.getEligibility(userId);
    if (eligibility.isCreator) throw new BadRequestException('Ya eres creador');
    if (!eligibility.canApply) {
      throw new ForbiddenException('Todavia no cumples los requisitos');
    }

    const open = await this.prisma.creatorApplication.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'MORE_INFO_REQUESTED'] },
      },
    });
    if (open) return open;

    return this.prisma.creatorApplication.create({
      data: {
        userId,
        message,
        eligibilitySnapshot: eligibility as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async creatorDashboard(userId: string) {
    const creator = await this.requireCreator(userId);
    const [
      counts,
      wallet,
      recentContents,
      comments,
      purchases,
      favorites,
      topSold,
      topFavorited,
      topRated,
    ] = await Promise.all([
      this.prisma.marketplaceContent.groupBy({
        by: ['status'],
        where: { creatorId: creator.id },
        _count: { status: true },
      }),
      this.prisma.creatorWallet.findUnique({
        where: { creatorId: creator.id },
        include: {
          movements: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      }),
      this.prisma.marketplaceContent.findMany({
        where: { creatorId: creator.id },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        include: contentInclude,
      }),
      this.prisma.marketplaceReviewComment.findMany({
        where: { creatorId: creator.id, visibleToCreator: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { content: { select: { id: true, title: true, status: true } } },
      }),
      this.prisma.marketplacePurchase.findMany({
        where: { creatorId: creator.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { content: true },
      }),
      this.prisma.marketplaceFavorite.count({
        where: { content: { creatorId: creator.id } },
      }),
      this.prisma.marketplaceContent.findFirst({
        where: { creatorId: creator.id },
        orderBy: [{ salesCount: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.marketplaceContent.findFirst({
        where: { creatorId: creator.id },
        orderBy: [{ favoritesCount: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.marketplaceContent.findFirst({
        where: { creatorId: creator.id },
        orderBy: [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }],
      }),
    ]);

    const countByStatus = Object.fromEntries(
      counts.map((item) => [item.status, item._count.status]),
    );
    const totalViews = recentContents.reduce(
      (sum, item) => sum + item.views,
      0,
    );
    const totalDownloads = recentContents.reduce(
      (sum, item) => sum + item.downloadsCount,
      0,
    );

    return {
      creator,
      wallet,
      stats: {
        draft: countByStatus.DRAFT ?? 0,
        pending: countByStatus.PENDING ?? 0,
        inReview: countByStatus.IN_REVIEW ?? 0,
        changesRequested: countByStatus.CHANGES_REQUESTED ?? 0,
        approved: countByStatus.APPROVED ?? 0,
        rejected: countByStatus.REJECTED ?? 0,
        published: countByStatus.PUBLISHED ?? 0,
        retired: countByStatus.RETIRED ?? 0,
        favorites,
        views: totalViews,
        downloads: totalDownloads,
        sales: creator.totalSales,
        coinsGenerated: creator.totalCoinsGross,
      },
      recentContents,
      comments,
      purchases,
      analytics: {
        topSold,
        topFavorited,
        topRated,
        totalViews,
        totalDownloads,
        conversion:
          totalViews > 0
            ? Number(((creator.totalSales / totalViews) * 100).toFixed(2))
            : 0,
      },
      goals: [
        {
          label: 'Sube tu primer objeto',
          current: recentContents.length,
          target: 1,
        },
        {
          label: 'Consigue 10 ventas',
          current: creator.totalSales,
          target: 10,
        },
        {
          label: 'Consigue 50 favoritos',
          current: favorites,
          target: 50,
        },
        {
          label: 'Consigue 100 valoraciones',
          current: recentContents.reduce((sum, item) => sum + item.ratingCount, 0),
          target: 100,
        },
      ],
    };
  }

  async listCreatorContents(userId: string) {
    const creator = await this.requireCreator(userId);
    return this.prisma.marketplaceContent.findMany({
      where: { creatorId: creator.id },
      orderBy: { updatedAt: 'desc' },
      include: contentInclude,
    });
  }

  async withdrawCreatorWallet(userId: string) {
    const creator = await this.requireCreator(userId);

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.creatorWallet.findUnique({
        where: { creatorId: creator.id },
      });
      if (!wallet || wallet.availableBalance <= 0) {
        throw new BadRequestException('No tienes saldo disponible para retirar');
      }

      const amount = wallet.availableBalance;
      const updatedWallet = await tx.creatorWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: 0,
          totalWithdrawn: { increment: amount },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { coins: { increment: amount } },
      });

      await tx.coinTransaction.create({
        data: {
          userId,
          amount,
          reason: 'marketplace:creator-wallet-withdrawal',
        },
      });

      await tx.creatorWalletMovement.create({
        data: {
          creatorId: creator.id,
          walletId: wallet.id,
          userId,
          type: MarketplaceWalletMovementType.WITHDRAWAL,
          amount: -amount,
          balanceAfter: 0,
          description: `Retiro de ${amount} Coins al balance principal`,
        },
      });

      return updatedWallet;
    });
  }

  async createContentDraft(userId: string, dto: Record<string, any>) {
    const creator = await this.requireCreator(userId);
    await this.assertCreatorCanPublish(creator.id);
    const settings = await this.getSettings();
    const priceCoins = Number(dto.priceCoins);
    this.validateContentPayload(dto, settings, false);

    return this.prisma.$transaction(async (tx) => {
      const content = await tx.marketplaceContent.create({
        data: {
          creatorId: creator.id,
          type: dto.type ?? MarketplaceContentType.WORLD_ITEM,
          title: String(dto.title).trim(),
          description: dto.description,
          category: dto.category,
          tags: Array.isArray(dto.tags) ? dto.tags : [],
          spriteUrl: dto.spriteUrl,
          previewUrl: dto.previewUrl,
          priceCoins,
          payload: (dto.payload ?? {}) as Prisma.InputJsonValue,
          status: MarketplaceContentStatus.DRAFT,
        },
      });
      await this.createVersion(tx, content.id, content, 'Borrador creado');
      return content;
    });
  }

  async updateContent(userId: string, contentId: string, dto: Record<string, any>) {
    const creator = await this.requireCreator(userId);
    const content = await this.getOwnedContent(creator.id, contentId);
    if (content.status === 'RETIRED') {
      throw new BadRequestException('No puedes editar un contenido retirado');
    }
    const settings = await this.getSettings();
    this.validateContentPayload({ ...content, ...dto }, settings, false);

    return this.prisma.$transaction(async (tx) => {
      if (content.status === 'PUBLISHED') {
        const draft = await tx.marketplaceContent.create({
          data: {
            creatorId: creator.id,
            type: content.type,
            title: dto.title ?? content.title,
            description: dto.description ?? content.description,
            category: dto.category ?? content.category,
            tags: Array.isArray(dto.tags) ? dto.tags : content.tags,
            spriteUrl: dto.spriteUrl ?? content.spriteUrl,
            previewUrl: dto.previewUrl ?? content.previewUrl,
            priceCoins:
              dto.priceCoins !== undefined
                ? Number(dto.priceCoins)
                : content.priceCoins,
            payload:
              dto.payload !== undefined
                ? (dto.payload as Prisma.InputJsonValue)
                : (content.payload ?? {}) as Prisma.InputJsonValue,
            metadata: {
              ...((content.metadata ?? {}) as Record<string, any>),
              replacesContentId: content.id,
              sourcePublishedItemId: content.publishedItemId,
            } as Prisma.InputJsonValue,
            publishedItemId: content.publishedItemId,
            status: MarketplaceContentStatus.DRAFT,
          },
        });
        await this.createVersion(tx, draft.id, draft, 'Nueva version desde publicado');
        return draft;
      }

      const updated = await tx.marketplaceContent.update({
        where: { id: contentId },
        data: {
          title: dto.title ?? content.title,
          description: dto.description ?? content.description,
          category: dto.category ?? content.category,
          tags: Array.isArray(dto.tags) ? dto.tags : content.tags,
          spriteUrl: dto.spriteUrl ?? content.spriteUrl,
          previewUrl: dto.previewUrl ?? content.previewUrl,
          priceCoins:
            dto.priceCoins !== undefined
              ? Number(dto.priceCoins)
              : content.priceCoins,
          payload:
            dto.payload !== undefined
              ? (dto.payload as Prisma.InputJsonValue)
              : (content.payload ?? {}) as Prisma.InputJsonValue,
          status:
            content.status === 'CHANGES_REQUESTED'
              ? MarketplaceContentStatus.DRAFT
              : content.status,
        },
      });
      await this.createVersion(tx, contentId, updated, dto.changeNote);
      return updated;
    });
  }

  async submitContent(userId: string, contentId: string) {
    const creator = await this.requireCreator(userId);
    const content = await this.getOwnedContent(creator.id, contentId);
    const settings = await this.getSettings();
    this.validateContentPayload(content, settings, true);
    await this.assertSubmissionLimits(creator.id, settings);

    return this.prisma.$transaction(async (tx) => {
      if (settings.publicationFeeCoins > 0) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user || user.coins < settings.publicationFeeCoins) {
          throw new BadRequestException('Coins insuficientes para enviar a revision');
        }
        await tx.user.update({
          where: { id: userId },
          data: { coins: { decrement: settings.publicationFeeCoins } },
        });
        await tx.coinTransaction.create({
          data: {
            userId,
            amount: -settings.publicationFeeCoins,
            reason: `marketplace:publication:${content.title}`,
          },
        });
      }

      const updated = await tx.marketplaceContent.update({
        where: { id: contentId },
        data: {
          status: MarketplaceContentStatus.PENDING,
          submittedAt: new Date(),
          validationSnapshot: this.buildValidationSnapshot(content) as Prisma.InputJsonValue,
        },
      });
      await this.createVersion(tx, contentId, updated, 'Enviado a revision');
      return updated;
    });
  }

  async adminDashboard() {
    const [
      applications,
      contentCounts,
      reports,
      creatorsActive,
      topSellers,
      salesTotals,
      fees,
    ] = await Promise.all([
      this.prisma.creatorApplication.count({ where: { status: 'PENDING' } }),
      this.prisma.marketplaceContent.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.marketplaceReport.count({ where: { status: 'OPEN' } }),
      this.prisma.creatorProfile.count({ where: { status: 'ACTIVE' } }),
      this.prisma.creatorProfile.findMany({
        orderBy: [{ totalSales: 'desc' }, { totalCoinsGross: 'desc' }],
        take: 5,
        include: { user: { select: { username: true, avatarUrl: true } } },
      }),
      this.prisma.marketplacePurchase.aggregate({
        _sum: { priceCoins: true, creatorEarnings: true, platformFee: true },
        _count: { id: true },
      }),
      this.prisma.coinTransaction.aggregate({
        where: { reason: { startsWith: 'marketplace:publication:' } },
        _sum: { amount: true },
      }),
    ]);
    const countByStatus = Object.fromEntries(
      contentCounts.map((item) => [item.status, item._count.status]),
    );
    return {
      applicationsPending: applications,
      reportsOpen: reports,
      creatorsActive,
      content: countByStatus,
      topSellers,
      economy: {
        grossCoins: salesTotals._sum.priceCoins ?? 0,
        creatorEarnings: salesTotals._sum.creatorEarnings ?? 0,
        commissions: salesTotals._sum.platformFee ?? 0,
        publicationFees: Math.abs(fees._sum.amount ?? 0),
        sales: salesTotals._count.id,
      },
    };
  }

  async listApplications(status?: CreatorApplicationStatus) {
    return this.prisma.creatorApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, username: true, email: true, level: true } } },
    });
  }

  async reviewApplication(
    applicationId: string,
    action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO',
    adminMessage?: string,
  ) {
    const application = await this.prisma.creatorApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundException('Solicitud no encontrada');

    return this.prisma.$transaction(async (tx) => {
      if (action === 'APPROVE') {
        const creator = await tx.creatorProfile.upsert({
          where: { userId: application.userId },
          update: { status: CreatorStatus.ACTIVE },
          create: { userId: application.userId },
        });
        await tx.creatorWallet.upsert({
          where: { creatorId: creator.id },
          update: {},
          create: { creatorId: creator.id },
        });
        return tx.creatorApplication.update({
          where: { id: applicationId },
          data: {
            status: CreatorApplicationStatus.APPROVED,
            creatorId: creator.id,
            adminMessage,
            reviewedAt: new Date(),
          },
        });
      }

      return tx.creatorApplication.update({
        where: { id: applicationId },
        data: {
          status:
            action === 'REQUEST_INFO'
              ? CreatorApplicationStatus.MORE_INFO_REQUESTED
              : CreatorApplicationStatus.REJECTED,
          adminMessage,
          reviewedAt: new Date(),
        },
      });
    });
  }

  async adminListContents(status?: MarketplaceContentStatus) {
    return this.prisma.marketplaceContent.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: 'desc' },
      include: {
        ...contentInclude,
        versions: { orderBy: { version: 'desc' }, take: 5 },
        reviews: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
  }

  async reviewContent(
    admin: AuthUser,
    contentId: string,
    action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'PUBLISH' | 'RETIRE',
    comment?: string,
  ) {
    const content = await this.prisma.marketplaceContent.findUnique({
      where: { id: contentId },
    });
    if (!content) throw new NotFoundException('Contenido no encontrado');

    const nextStatus = {
      APPROVE: MarketplaceContentStatus.APPROVED,
      REJECT: MarketplaceContentStatus.REJECTED,
      REQUEST_CHANGES: MarketplaceContentStatus.CHANGES_REQUESTED,
      PUBLISH: MarketplaceContentStatus.PUBLISHED,
      RETIRE: MarketplaceContentStatus.RETIRED,
    }[action];

    return this.prisma.$transaction(async (tx) => {
      let publishedItemId = content.publishedItemId;
      const metadata = (content.metadata ?? {}) as Record<string, any>;
      if (nextStatus === MarketplaceContentStatus.PUBLISHED) {
        if (publishedItemId) {
          await this.updatePublishedItemFromContent(tx, publishedItemId, content);
        } else {
          publishedItemId = await this.createPublishedItemFromContent(tx, content);
        }
      }

      const updated = await tx.marketplaceContent.update({
        where: { id: contentId },
        data: {
          status: nextStatus,
          publishedItemId,
          reviewedAt: new Date(),
          publishedAt: nextStatus === 'PUBLISHED' ? new Date() : content.publishedAt,
          retiredAt: nextStatus === 'RETIRED' ? new Date() : content.retiredAt,
        },
      });
      if (comment) {
        await tx.marketplaceReviewComment.create({
          data: {
            contentId,
            creatorId: content.creatorId,
            adminId: admin.userId,
            message: comment,
            status: nextStatus,
          },
        });
      }
      await this.createVersion(tx, contentId, updated, `Admin: ${action}`);
      if (nextStatus === MarketplaceContentStatus.PUBLISHED && metadata.replacesContentId) {
        await tx.marketplaceContent.update({
          where: { id: String(metadata.replacesContentId) },
          data: {
            status: MarketplaceContentStatus.RETIRED,
            retiredAt: new Date(),
          },
        });
      }
      return updated;
    });
  }

  async listMarketplace(query: Record<string, string | undefined>) {
    const where: Prisma.MarketplaceContentWhereInput = {
      status: 'PUBLISHED',
      ...(query.type ? { type: query.type as MarketplaceContentType } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
              { tags: { has: query.q } },
            ],
          }
        : {}),
    };
    return this.prisma.marketplaceContent.findMany({
      where,
      orderBy: this.getMarketplaceOrder(query.sort),
      include: contentInclude,
      take: Math.min(Number(query.take) || 48, 100),
    });
  }

  async listFavorites(userId: string) {
    const favorites = await this.prisma.marketplaceFavorite.findMany({
      where: { userId, content: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      include: { content: { include: contentInclude } },
    });

    return favorites.map((favorite) => favorite.content);
  }

  async getMarketplaceContent(id: string) {
    const content = await this.prisma.marketplaceContent.update({
      where: { id },
      data: { views: { increment: 1 } },
      include: {
        ...contentInclude,
        ratings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { username: true, avatarUrl: true } } },
        },
      },
    });
    if (content.status !== 'PUBLISHED') throw new NotFoundException('Contenido no disponible');
    return content;
  }

  async buyContent(userId: string, contentId: string) {
    const content = await this.prisma.marketplaceContent.findUnique({
      where: { id: contentId },
      include: { creator: true },
    });
    if (!content || content.status !== 'PUBLISHED') {
      throw new NotFoundException('Contenido no disponible');
    }
    const settings = await this.getSettings();
    const platformFee = Math.floor((content.priceCoins * settings.commissionRate) / 100);
    const creatorEarnings = content.priceCoins - platformFee;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.coins < content.priceCoins) {
        throw new BadRequestException('Coins insuficientes');
      }
      const existing = await tx.marketplacePurchase.findUnique({
        where: { buyerId_contentId: { buyerId: userId, contentId } },
      });
      if (existing) throw new BadRequestException('Ya tienes este contenido');

      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: content.priceCoins } },
      });
      await tx.coinTransaction.create({
        data: {
          userId,
          amount: -content.priceCoins,
          reason: `marketplace:purchase:${content.title}`,
        },
      });

      if (content.publishedItemId) {
        await tx.userItem.upsert({
          where: {
            userId_itemId: { userId, itemId: content.publishedItemId },
          },
          update: { amount: { increment: 1 } },
          create: {
            userId,
            itemId: content.publishedItemId,
            amount: 1,
            source: 'marketplace',
          },
        });
      }

      const purchase = await tx.marketplacePurchase.create({
        data: {
          buyerId: userId,
          creatorId: content.creatorId,
          contentId,
          itemId: content.publishedItemId,
          priceCoins: content.priceCoins,
          creatorEarnings,
          platformFee,
        },
      });

      const wallet = await tx.creatorWallet.upsert({
        where: { creatorId: content.creatorId },
        update: {
          availableBalance: { increment: creatorEarnings },
          historicalTotal: { increment: creatorEarnings },
          totalSales: { increment: 1 },
          totalCommissions: { increment: platformFee },
        },
        create: {
          creatorId: content.creatorId,
          availableBalance: creatorEarnings,
          historicalTotal: creatorEarnings,
          totalSales: 1,
          totalCommissions: platformFee,
        },
      });

      await tx.creatorWalletMovement.create({
        data: {
          creatorId: content.creatorId,
          walletId: wallet.id,
          userId,
          type: MarketplaceWalletMovementType.SALE_EARNING,
          amount: creatorEarnings,
          balanceAfter: wallet.availableBalance,
          contentId,
          purchaseId: purchase.id,
          description: `Venta de ${content.title}`,
        },
      });

      await tx.creatorProfile.update({
        where: { id: content.creatorId },
        data: {
          totalSales: { increment: 1 },
          totalCoinsGross: { increment: content.priceCoins },
        },
      });
      await tx.marketplaceContent.update({
        where: { id: contentId },
        data: { salesCount: { increment: 1 }, downloadsCount: { increment: 1 } },
      });

      return purchase;
    });
  }

  async toggleFavorite(userId: string, contentId: string) {
    const existing = await this.prisma.marketplaceFavorite.findUnique({
      where: { userId_contentId: { userId, contentId } },
    });
    if (existing) {
      await this.prisma.$transaction([
        this.prisma.marketplaceFavorite.delete({ where: { id: existing.id } }),
        this.prisma.marketplaceContent.update({
          where: { id: contentId },
          data: { favoritesCount: { decrement: 1 } },
        }),
      ]);
      return { favorited: false };
    }
    await this.prisma.$transaction([
      this.prisma.marketplaceFavorite.create({ data: { userId, contentId } }),
      this.prisma.marketplaceContent.update({
        where: { id: contentId },
        data: { favoritesCount: { increment: 1 } },
      }),
    ]);
    return { favorited: true };
  }

  async rateContent(userId: string, contentId: string, rating: number, comment?: string) {
    if (rating < 1 || rating > 5) throw new BadRequestException('Rating invalido');
    const purchase = await this.prisma.marketplacePurchase.findUnique({
      where: { buyerId_contentId: { buyerId: userId, contentId } },
    });
    if (!purchase?.usedAt) {
      throw new ForbiddenException('Debes usar este contenido antes de valorar');
    }

    await this.prisma.marketplaceRating.upsert({
      where: { userId_contentId: { userId, contentId } },
      update: { rating, comment },
      create: { userId, contentId, rating, comment },
    });
    const aggregate = await this.prisma.marketplaceRating.aggregate({
      where: { contentId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return this.prisma.marketplaceContent.update({
      where: { id: contentId },
      data: {
        ratingAverage: aggregate._avg.rating ?? 0,
        ratingCount: aggregate._count.rating,
      },
    });
  }

  async reportContent(
    userId: string,
    contentId: string,
    reason: MarketplaceReportReason,
    message?: string,
  ) {
    return this.prisma.marketplaceReport.create({
      data: { userId, contentId, reason, message },
    });
  }

  async listCreators() {
    return this.prisma.creatorProfile.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ featured: 'desc' }, { totalSales: 'desc' }],
      include: {
        user: { select: { username: true, avatarUrl: true } },
        _count: { select: { contents: true } },
      },
    });
  }

  async getCreatorProfile(idOrUsername: string) {
    const creator = await this.prisma.creatorProfile.findFirst({
      where: {
        OR: [
          { id: idOrUsername },
          { user: { username: idOrUsername } },
        ],
      },
      include: {
        user: { select: { username: true, avatarUrl: true, createdAt: true } },
        contents: {
          where: { status: 'PUBLISHED' },
          orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
          include: contentInclude,
        },
      },
    });
    if (!creator) throw new NotFoundException('Creador no encontrado');
    return creator;
  }

  private async requireCreator(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      include: { wallet: true, user: true },
    });
    if (!creator) throw new ForbiddenException('Aun no eres creador aprobado');
    if (creator.status !== 'ACTIVE') throw new ForbiddenException('Creador no activo');
    if (creator.suspendedUntil && creator.suspendedUntil > new Date()) {
      throw new ForbiddenException('Creador suspendido temporalmente');
    }
    return creator;
  }

  private async getOwnedContent(creatorId: string, contentId: string) {
    const content = await this.prisma.marketplaceContent.findFirst({
      where: { id: contentId, creatorId },
    });
    if (!content) throw new NotFoundException('Contenido no encontrado');
    return content;
  }

  private validateContentPayload(
    dto: Record<string, any>,
    settings: Awaited<ReturnType<MarketplaceService['getSettings']>>,
    strict: boolean,
  ) {
    const price = Number(dto.priceCoins);
    if (!dto.title || String(dto.title).trim().length < 3) {
      throw new BadRequestException('El nombre debe tener al menos 3 caracteres');
    }
    if (!Number.isFinite(price) || price < settings.minPriceCoins || price > settings.maxPriceCoins) {
      throw new BadRequestException(
        `El precio debe estar entre ${settings.minPriceCoins} y ${settings.maxPriceCoins} Coins`,
      );
    }
    if (strict) {
      if (!dto.spriteUrl && !dto.previewUrl) throw new BadRequestException('Sprite o preview requerido');
      if (!dto.category) throw new BadRequestException('Categoria requerida');
      if (!dto.payload || typeof dto.payload !== 'object') {
        throw new BadRequestException('Payload tecnico requerido');
      }
    }
  }

  private buildValidationSnapshot(content: Record<string, any>) {
    return {
      sprite: Boolean(content.spriteUrl || content.previewUrl),
      title: Boolean(content.title),
      price: Boolean(content.priceCoins),
      category: Boolean(content.category),
      payload: Boolean(content.payload),
      validatedAt: new Date().toISOString(),
    };
  }

  private getMarketplaceOrder(sort?: string): Prisma.MarketplaceContentOrderByWithRelationInput[] {
    if (sort === 'favorites') return [{ featured: 'desc' }, { favoritesCount: 'desc' }, { publishedAt: 'desc' }];
    if (sort === 'sales') return [{ featured: 'desc' }, { salesCount: 'desc' }, { publishedAt: 'desc' }];
    if (sort === 'rating') return [{ featured: 'desc' }, { ratingAverage: 'desc' }, { ratingCount: 'desc' }];
    if (sort === 'popular') return [{ featured: 'desc' }, { salesCount: 'desc' }, { favoritesCount: 'desc' }];
    return [{ featured: 'desc' }, { publishedAt: 'desc' }];
  }

  private async assertCreatorCanPublish(creatorId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorId },
    });
    if (!creator) throw new ForbiddenException('Creador no encontrado');
    if (creator.status !== 'ACTIVE') throw new ForbiddenException('Creador no activo');
  }

  private async assertSubmissionLimits(
    creatorId: string,
    settings: Awaited<ReturnType<MarketplaceService['getSettings']>>,
  ) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const [pending, published, today, week] = await Promise.all([
      this.prisma.marketplaceContent.count({
        where: { creatorId, status: { in: ['PENDING', 'IN_REVIEW'] } },
      }),
      this.prisma.marketplaceContent.count({
        where: { creatorId, status: 'PUBLISHED' },
      }),
      this.prisma.marketplaceContent.count({
        where: { creatorId, submittedAt: { gte: startOfDay } },
      }),
      this.prisma.marketplaceContent.count({
        where: { creatorId, submittedAt: { gte: startOfWeek } },
      }),
    ]);
    if (pending >= settings.maxPendingItems) throw new BadRequestException('Limite de pendientes alcanzado');
    if (published >= settings.maxPublishedItems) throw new BadRequestException('Limite de publicados alcanzado');
    if (today >= settings.maxSubmissionsPerDay) throw new BadRequestException('Limite diario alcanzado');
    if (week >= settings.maxSubmissionsPerWeek) throw new BadRequestException('Limite semanal alcanzado');
  }

  private async createVersion(
    tx: Prisma.TransactionClient,
    contentId: string,
    content: Pick<
      Prisma.MarketplaceContentGetPayload<Record<string, never>>,
      'title' | 'description' | 'priceCoins' | 'payload' | 'status'
    >,
    changeNote?: string,
  ) {
    const latest = await tx.marketplaceContentVersion.findFirst({
      where: { contentId },
      orderBy: { version: 'desc' },
    });
      return tx.marketplaceContentVersion.create({
      data: {
        contentId,
        version: (latest?.version ?? 0) + 1,
        title: content.title,
        description: content.description,
        priceCoins: content.priceCoins,
        payload: content.payload as Prisma.InputJsonValue,
        statusAtCreation: content.status,
        changeNote,
      },
    });
  }

  private async createPublishedItemFromContent(
    tx: Prisma.TransactionClient,
    content: Prisma.MarketplaceContentGetPayload<Record<string, never>>,
  ) {
    const payload = (content.payload ?? {}) as Record<string, any>;
    const worldData = payload.worldData ?? payload;
    const avatarData = payload.avatarData ?? {};
    const itemData = payload.item ?? {};
    const imageUrl =
      content.spriteUrl ||
      content.previewUrl ||
      payload.imageUrl ||
      payload.spriteSheetUrl ||
      null;
    const itemType =
      content.type === MarketplaceContentType.AVATAR_ITEM
        ? ItemType.AVATAR
        : ItemType.WORLD;

    const item = await tx.item.create({
      data: {
        imageUrl,
        coinsPrice: content.priceCoins,
        gemsPrice: 0,
        shopVisible: false,
        category: content.category,
        tags: content.tags,
        type: itemType,
        rarity: Number(itemData.rarity ?? payload.rarity) || 0,
        maxStack: Number(itemData.maxStack ?? payload.maxStack) || 99,
        accessType: 'FREE',
        isTradable: true,
        isSellable: true,
        colorable: Boolean(itemData.colorable ?? payload.colorable),
      },
    });

    const language = await tx.language.findFirst({
      where: { code: 'es' },
      select: { id: true },
    });
    if (language) {
      await tx.itemTranslation.create({
        data: {
          itemId: item.id,
          languageId: language.id,
          name: content.title,
          description: content.description,
        },
      });
    }

    if (itemType === ItemType.AVATAR) {
      await tx.avatarItemData.create({
        data: {
          itemId: item.id,
          slot: (avatarData.slot || 'BODY') as AvatarSlotType,
        },
      });
      const itemSprite = avatarData.itemSprite;
      if (itemSprite?.imageUrl) {
        const animation = await tx.animation.findFirst({
          where: {
            OR: [
              { variant: String(itemSprite.animation || 'idle') },
              { name: { contains: String(itemSprite.animation || 'idle'), mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });
        if (animation) {
          await tx.itemSprite.upsert({
            where: {
              itemId_animationId_direction: {
                itemId: item.id,
                animationId: animation.id,
                direction: 'SOUTH',
              },
            },
            update: {
              imageUrl: String(itemSprite.imageUrl),
              frameWidth: Number(itemSprite.frameWidth) || 64,
              frameHeight: Number(itemSprite.frameHeight) || 64,
              framesCount: Number(itemSprite.framesCount) || 1,
              row: Number(itemSprite.rowIndex) || 0,
            },
            create: {
              itemId: item.id,
              animationId: animation.id,
              direction: 'SOUTH',
              imageUrl: String(itemSprite.imageUrl),
              frameWidth: Number(itemSprite.frameWidth) || 64,
              frameHeight: Number(itemSprite.frameHeight) || 64,
              framesCount: Number(itemSprite.framesCount) || 1,
              row: Number(itemSprite.rowIndex) || 0,
            },
          });
        }
      }
      return item.id;
    }

    const width = Math.max(1, Number(worldData.width) || 1);
    const height = Math.max(1, Number(worldData.height) || 1);
    const footprintWidth = Math.max(1, Number(worldData.footprintWidth) || width);
    const footprintHeight = Math.max(1, Number(worldData.footprintHeight) || height);

    await tx.worldItemData.create({
      data: {
        itemId: item.id,
        width,
        height,
        spriteSheetUrl: worldData.spriteSheetUrl || imageUrl,
        previewImageUrl: content.previewUrl || imageUrl,
        frameWidth: Number(worldData.frameWidth) || null,
        frameHeight: Number(worldData.frameHeight) || null,
        footprintWidth,
        footprintHeight,
        syncDirections: worldData.syncDirections ?? true,
        footprints:
          worldData.footprints !== undefined
            ? (worldData.footprints as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        surfaces:
          worldData.surfaces !== undefined
            ? (worldData.surfaces as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        engineData:
          worldData.engineData !== undefined
            ? (worldData.engineData as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        directions: Number(worldData.directions) || 4,
        kind: (worldData.kind || WorldItemKind.FURNITURE) as WorldItemKind,
        category: (worldData.furnitureCategory ||
          worldData.category ||
          FurnitureCategory.DECORATION) as FurnitureCategory,
        isCollidable: Boolean(worldData.isCollidable),
        walkable: Boolean(worldData.walkable),
        isInteractable: Boolean(worldData.isInteractable),
        rotatable: worldData.rotatable ?? true,
        placementType: (worldData.placementType || PlacementType.FLOOR) as PlacementType,
        allowsStacking: Boolean(worldData.allowsStacking),
        canBeStacked: Boolean(worldData.canBeStacked),
        stackHeight: Number(worldData.stackHeight) || 1,
        maxStackHeight: Number(worldData.maxStackHeight) || 0,
        interactionTypes: Array.isArray(worldData.interactionTypes)
          ? worldData.interactionTypes
          : [],
        sitX: worldData.sitX ?? null,
        sitY: worldData.sitY ?? null,
        sitElevation: worldData.sitElevation ?? null,
        teleportTargetRoomId: worldData.teleportTargetRoomId ?? null,
        teleportTargetX: worldData.teleportTargetX ?? null,
        teleportTargetY: worldData.teleportTargetY ?? null,
      },
    });

    return item.id;
  }

  private async updatePublishedItemFromContent(
    tx: Prisma.TransactionClient,
    itemId: string,
    content: Prisma.MarketplaceContentGetPayload<Record<string, never>>,
  ) {
    const payload = (content.payload ?? {}) as Record<string, any>;
    const worldData = payload.worldData ?? payload;
    const avatarData = payload.avatarData ?? {};
    const itemData = payload.item ?? {};
    const imageUrl =
      content.spriteUrl ||
      content.previewUrl ||
      payload.imageUrl ||
      payload.spriteSheetUrl ||
      null;

    await tx.item.update({
      where: { id: itemId },
      data: {
        imageUrl,
        coinsPrice: content.priceCoins,
        category: content.category,
        tags: content.tags,
        rarity: Number(itemData.rarity ?? payload.rarity) || 0,
        colorable: Boolean(itemData.colorable ?? payload.colorable),
      },
    });

    await tx.itemTranslation.updateMany({
      where: { itemId },
      data: {
        name: content.title,
        description: content.description,
      },
    });

    if (content.type === MarketplaceContentType.AVATAR_ITEM) {
      await tx.avatarItemData.upsert({
        where: { itemId },
        update: { slot: (avatarData.slot || 'BODY') as AvatarSlotType },
        create: {
          itemId,
          slot: (avatarData.slot || 'BODY') as AvatarSlotType,
        },
      });
      return itemId;
    }

    await tx.worldItemData.upsert({
      where: { itemId },
      update: {
        width: Math.max(1, Number(worldData.width) || 1),
        height: Math.max(1, Number(worldData.height) || 1),
        spriteSheetUrl: worldData.spriteSheetUrl || imageUrl,
        previewImageUrl: content.previewUrl || imageUrl,
        frameWidth: Number(worldData.frameWidth) || null,
        frameHeight: Number(worldData.frameHeight) || null,
        footprintWidth: Math.max(1, Number(worldData.footprintWidth) || 1),
        footprintHeight: Math.max(1, Number(worldData.footprintHeight) || 1),
        syncDirections: worldData.syncDirections ?? true,
        footprints:
          worldData.footprints !== undefined
            ? (worldData.footprints as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        surfaces:
          worldData.surfaces !== undefined
            ? (worldData.surfaces as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
      create: {
        itemId,
        width: Math.max(1, Number(worldData.width) || 1),
        height: Math.max(1, Number(worldData.height) || 1),
        kind: (worldData.kind || WorldItemKind.FURNITURE) as WorldItemKind,
        spriteSheetUrl: worldData.spriteSheetUrl || imageUrl,
        previewImageUrl: content.previewUrl || imageUrl,
        footprintWidth: Math.max(1, Number(worldData.footprintWidth) || 1),
        footprintHeight: Math.max(1, Number(worldData.footprintHeight) || 1),
      },
    });

    return itemId;
  }
}
