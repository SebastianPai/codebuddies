import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BackgroundAccessType, PremiumSubscriptionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpsertBackgroundDto } from './dto/upsert-background.dto';
import { UpsertBackgroundCategoryDto } from './dto/upsert-background-category.dto';

// name/description en RoomBackground quedan sincronizados desde la
// traducción "es" (o la primera si no hay es) para no romper a los
// lectores que ya usan esos campos directo (listAdmin, mapAccess, etc.),
// igual que se resolvió antes para RoomLayout/RoomLayoutTranslation.
function pickCanonicalTranslation(translations: UpsertBackgroundDto['translations']) {
  return translations.find((t) => t.languageCode === 'es') ?? translations[0];
}

@Injectable()
export class BackgroundsService {
  constructor(private readonly prisma: PrismaService) {}

  private backgroundInclude(userId?: string) {
    return {
      category: true,
      translations: { include: { language: true } },
      owners: userId ? { where: { userId } } : false,
    } satisfies Prisma.RoomBackgroundInclude;
  }

  private slug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async hasPremium(userId: string) {
    const sub = await this.prisma.premiumSubscription.findFirst({
      where: {
        userId,
        status: PremiumSubscriptionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    return Boolean(sub);
  }

  async findById(id: string, userId?: string) {
    const background = await this.prisma.roomBackground.findUnique({
      where: { id },
      include: this.backgroundInclude(userId),
    });

    if (!background) throw new NotFoundException('Fondo no encontrado');
    return background;
  }

  private async mapAccess(background: any, userId?: string) {
    const premium = userId ? await this.hasPremium(userId) : false;
    const owned = Boolean(background.owners?.length);
    const accessType = background.accessType as BackgroundAccessType;
    const free = accessType === BackgroundAccessType.FREE;
    const premiumAllowed = accessType === BackgroundAccessType.PREMIUM && premium;
    const eventAllowed = accessType === BackgroundAccessType.EVENT && owned;
    const purchasableAllowed = accessType === BackgroundAccessType.PURCHASABLE && owned;
    const canUse = free || premiumAllowed || eventAllowed || purchasableAllowed;

    return {
      ...background,
      previewUrl: background.previewUrl ?? background.imageUrl,
      owned,
      userHasPremium: premium,
      canUse,
      lockedReason: canUse
        ? null
        : accessType === BackgroundAccessType.PREMIUM
          ? 'PREMIUM_REQUIRED'
          : accessType === BackgroundAccessType.PURCHASABLE
            ? 'PURCHASE_REQUIRED'
            : 'EVENT_REQUIRED',
    };
  }

  async listAvailableForUser(userId: string, query: { categoryId?: string; shop?: string } = {}) {
    const backgrounds = await this.prisma.roomBackground.findMany({
      where: {
        active: true,
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.shop === 'true' ? { shopVisible: true } : {}),
      },
      include: this.backgroundInclude(userId),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return Promise.all(backgrounds.map((background) => this.mapAccess(background, userId)));
  }

  async assertCanUse(userId: string, backgroundId?: string | null) {
    if (!backgroundId) return null;
    const background = await this.findById(backgroundId, userId);
    if (!background.active) throw new BadRequestException('Fondo inactivo');
    const mapped = await this.mapAccess(background, userId);
    if (!mapped.canUse) throw new ForbiddenException('No tienes acceso a este fondo');
    return mapped;
  }

  async buyBackground(userId: string, backgroundId: string) {
    const background = await this.findById(backgroundId, userId);
    if (!background.active || !background.shopVisible) {
      throw new BadRequestException('Fondo no disponible');
    }

    if (background.accessType === BackgroundAccessType.PREMIUM) {
      throw new BadRequestException('Este fondo se desbloquea con Premium');
    }

    if (background.accessType === BackgroundAccessType.FREE) {
      return this.prisma.userRoomBackground.upsert({
        where: { userId_backgroundId: { userId, backgroundId } },
        update: {},
        create: { userId, backgroundId, source: 'free' },
      });
    }

    if (background.accessType !== BackgroundAccessType.PURCHASABLE) {
      throw new BadRequestException('Este fondo no se puede comprar');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.coins < background.coinsPrice) {
      throw new BadRequestException('No tienes monedas suficientes');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: background.coinsPrice } },
      });

      await tx.coinTransaction.create({
        data: {
          userId,
          amount: -background.coinsPrice,
          reason: `background:${backgroundId}`,
        },
      });

      return tx.userRoomBackground.upsert({
        where: { userId_backgroundId: { userId, backgroundId } },
        update: {},
        create: { userId, backgroundId, source: 'shop' },
      });
    });
  }

  listAdmin(query: { search?: string; categoryId?: string; accessType?: BackgroundAccessType; active?: string }) {
    return this.prisma.roomBackground.findMany({
      where: {
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.accessType ? { accessType: query.accessType } : {}),
        ...(query.active ? { active: query.active === 'true' } : {}),
      },
      include: {
        category: true,
        translations: { include: { language: true } },
        _count: { select: { rooms: true, owners: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  create(dto: UpsertBackgroundDto) {
    if (!dto.translations?.length) {
      throw new BadRequestException(
        'Se requiere al menos una traducción para crear un fondo',
      );
    }

    const canonical = pickCanonicalTranslation(dto.translations);
    return this.prisma.roomBackground.create({
      data: {
        ...this.backgroundData(dto),
        name: canonical.name.trim(),
        description: canonical.description ?? undefined,
        translations: {
          create: dto.translations.map((t) => ({
            language: { connect: { code: t.languageCode } },
            name: t.name.trim(),
            description: t.description ?? null,
          })),
        },
      },
      include: this.backgroundInclude(),
    });
  }

  async update(id: string, dto: UpsertBackgroundDto) {
    if (dto.translations?.length) {
      const existing = await this.prisma.roomBackground.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (!existing) throw new NotFoundException('Fondo no encontrado');

      for (const t of dto.translations) {
        const language = await this.prisma.language.findUnique({
          where: { code: t.languageCode },
        });
        if (!language) continue;

        const existingTranslation = existing.translations.find(
          (tr) => tr.languageId === language.id,
        );

        if (existingTranslation) {
          await this.prisma.roomBackgroundTranslation.update({
            where: { id: existingTranslation.id },
            data: { name: t.name.trim(), description: t.description ?? null },
          });
        } else {
          await this.prisma.roomBackgroundTranslation.create({
            data: {
              backgroundId: id,
              languageId: language.id,
              name: t.name.trim(),
              description: t.description ?? null,
            },
          });
        }
      }
    }

    // Igual que en LayoutsService.updateLayout: sin "es" en este PATCH
    // puntual, el canónico existente no se toca.
    const canonical = dto.translations?.find((t) => t.languageCode === 'es');

    return this.prisma.roomBackground.update({
      where: { id },
      data: {
        ...this.backgroundData(dto),
        name: canonical ? canonical.name.trim() : undefined,
        description: canonical ? canonical.description ?? undefined : undefined,
      },
      include: this.backgroundInclude(),
    });
  }

  delete(id: string) {
    return this.prisma.roomBackground.delete({ where: { id } });
  }

  listCategories(includeInactive = false) {
    return this.prisma.roomBackgroundCategory.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  createCategory(dto: UpsertBackgroundCategoryDto) {
    return this.prisma.roomBackgroundCategory.create({ data: this.categoryData(dto) });
  }

  updateCategory(id: string, dto: UpsertBackgroundCategoryDto) {
    return this.prisma.roomBackgroundCategory.update({ where: { id }, data: this.categoryData(dto) });
  }

  deleteCategory(id: string) {
    return this.prisma.roomBackgroundCategory.delete({ where: { id } });
  }

  private backgroundData(dto: UpsertBackgroundDto) {
    const accessType = dto.accessType ?? (dto.isPremium ? BackgroundAccessType.PREMIUM : BackgroundAccessType.FREE);
    return {
      imageUrl: dto.imageUrl,
      previewUrl: dto.previewUrl || dto.imageUrl,
      categoryId: dto.categoryId || null,
      active: dto.active ?? true,
      sortOrder: Number(dto.sortOrder ?? 0),
      accessType,
      isPremium: accessType === BackgroundAccessType.PREMIUM,
      isVip: dto.isVip ?? false,
      shopVisible: dto.shopVisible ?? true,
      coinsPrice: Number(dto.coinsPrice ?? 0),
      gemsPrice: Number(dto.gemsPrice ?? 0),
      metadata: dto.metadata ?? undefined,
    };
  }

  private categoryData(dto: UpsertBackgroundCategoryDto) {
    return {
      name: dto.name,
      slug: dto.slug ? this.slug(dto.slug) : this.slug(dto.name),
      description: dto.description,
      active: dto.active ?? true,
      sortOrder: Number(dto.sortOrder ?? 0),
      metadata: dto.metadata ?? undefined,
    };
  }
}
