import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MarketplaceWalletMovementType, Prisma, Role } from '@prisma/client';
import { readBehavior, upgradeableStates } from '@codebuddies/world-objects';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateItemUpgradeDto, UpdateItemUpgradeDto } from './item-upgrade.dto';

type Actor = { userId: string; role?: Role | string };

@Injectable()
export class ItemUpgradesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- lectura

  // Mejoras de un objeto + (con sesión) cuáles ya tiene el jugador y si
  // puede comprarlas. `states` son los estados del behavior que se pueden
  // ofrecer, para el editor.
  async listForItem(itemId: string, viewerId?: string) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, worldData: { select: { behavior: true } } },
    });
    if (!item) throw new NotFoundException('Objeto no encontrado');
    const behavior = readBehavior(item.worldData?.behavior);

    const upgrades = await this.prisma.itemUpgrade.findMany({
      where: { itemId, active: true },
      orderBy: [{ sortOrder: 'asc' }, { priceCoins: 'asc' }],
    });

    let owned = new Set<string>();
    let ownsItem = false;
    if (viewerId) {
      const [purchases, inventory, placed] = await Promise.all([
        this.prisma.userItemUpgrade.findMany({
          where: { userId: viewerId, itemId },
          select: { upgradeId: true },
        }),
        this.prisma.userItem.findFirst({ where: { userId: viewerId, itemId }, select: { id: true } }),
        this.prisma.roomItem.findFirst({ where: { userId: viewerId, itemId }, select: { id: true } }),
      ]);
      owned = new Set(purchases.map((p) => p.upgradeId));
      ownsItem = Boolean(inventory || placed);
    }

    return {
      itemId,
      hasBehavior: Boolean(behavior),
      states: behavior ? upgradeableStates(behavior) : [],
      ownsItem,
      upgrades: upgrades.map((upgrade) => ({
        id: upgrade.id,
        key: upgrade.key,
        name: upgrade.name,
        description: upgrade.description,
        priceCoins: upgrade.priceCoins,
        unlockStates: upgrade.unlockStates,
        requiresId: upgrade.requiresId,
        sortOrder: upgrade.sortOrder,
        owned: owned.has(upgrade.id),
        available: !upgrade.requiresId || owned.has(upgrade.requiresId),
      })),
    };
  }

  // ----------------------------------------------------------------- compra

  // Una vez por jugador y mejora; vale para todas sus copias del objeto. Si el
  // objeto salió del marketplace, el creador cobra su parte igual que en una
  // venta (mismo commissionRate).
  async buy(userId: string, upgradeId: string) {
    const upgrade = await this.prisma.itemUpgrade.findUnique({ where: { id: upgradeId } });
    if (!upgrade || !upgrade.active) throw new NotFoundException('Mejora no disponible');

    const [inventory, placed] = await Promise.all([
      this.prisma.userItem.findFirst({ where: { userId, itemId: upgrade.itemId }, select: { id: true } }),
      this.prisma.roomItem.findFirst({ where: { userId, itemId: upgrade.itemId }, select: { id: true } }),
    ]);
    if (!inventory && !placed) {
      throw new ForbiddenException('Primero necesitas tener este objeto');
    }

    if (upgrade.requiresId) {
      const hasRequired = await this.prisma.userItemUpgrade.findUnique({
        where: { userId_upgradeId: { userId, upgradeId: upgrade.requiresId } },
      });
      if (!hasRequired) throw new BadRequestException('Primero compra la mejora anterior');
    }

    const content = await this.prisma.marketplaceContent.findFirst({
      where: { publishedItemId: upgrade.itemId, status: 'PUBLISHED' },
      select: { id: true, creatorId: true, title: true },
    });
    const settings = content
      ? await this.prisma.marketplaceSettings.findUnique({ where: { id: 'default' } })
      : null;
    const platformFee = content
      ? Math.floor((upgrade.priceCoins * (settings?.commissionRate ?? 20)) / 100)
      : upgrade.priceCoins;
    const creatorEarnings = upgrade.priceCoins - platformFee;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const purchase = await tx.userItemUpgrade.create({
          data: { userId, upgradeId, itemId: upgrade.itemId, pricePaid: upgrade.priceCoins },
        });

        const debited = await tx.user.updateMany({
          where: { id: userId, coins: { gte: upgrade.priceCoins } },
          data: { coins: { decrement: upgrade.priceCoins } },
        });
        if (debited.count === 0) throw new BadRequestException('Coins insuficientes');

        await tx.coinTransaction.create({
          data: { userId, amount: -upgrade.priceCoins, reason: `item-upgrade:${upgrade.key}:${upgrade.itemId}` },
        });

        if (content && creatorEarnings > 0) {
          const wallet = await tx.creatorWallet.upsert({
            where: { creatorId: content.creatorId },
            update: {
              availableBalance: { increment: creatorEarnings },
              historicalTotal: { increment: creatorEarnings },
              totalCommissions: { increment: platformFee },
            },
            create: {
              creatorId: content.creatorId,
              availableBalance: creatorEarnings,
              historicalTotal: creatorEarnings,
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
              contentId: content.id,
              description: `Mejora "${upgrade.name}" de ${content.title}`,
              metadata: { upgradeId: upgrade.id },
            },
          });
        }

        return { purchase, priceCoins: upgrade.priceCoins, unlockStates: upgrade.unlockStates };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Ya tienes esta mejora');
      }
      throw error;
    }
  }

  // ------------------------------------------------- administración/creador

  // Pueden editar las mejoras un admin o el creador dueño del contenido del
  // marketplace que publicó este objeto.
  private async assertCanManage(actor: Actor, itemId: string) {
    if (actor.role === Role.ADMIN) return;
    const content = await this.prisma.marketplaceContent.findFirst({
      where: { publishedItemId: itemId, creator: { userId: actor.userId } },
      select: { id: true },
    });
    if (!content) throw new ForbiddenException('No puedes editar las mejoras de este objeto');
  }

  private async validateStates(itemId: string, states: string[], requiresId?: string | null) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      select: { worldData: { select: { behavior: true } } },
    });
    if (!item) throw new NotFoundException('Objeto no encontrado');
    const behavior = readBehavior(item.worldData?.behavior);
    if (!behavior) {
      throw new BadRequestException('El objeto necesita un comportamiento (estados) antes de venderle mejoras');
    }
    const allowed = new Set(upgradeableStates(behavior));
    const invalid = states.filter((state) => !allowed.has(state));
    if (states.length === 0) throw new BadRequestException('Elige al menos un estado que desbloquee la mejora');
    if (invalid.length) {
      throw new BadRequestException(
        `Estados no válidos: ${invalid.join(', ')}. Disponibles: ${[...allowed].join(', ') || 'ninguno'}`,
      );
    }
    if (requiresId) {
      const required = await this.prisma.itemUpgrade.findUnique({ where: { id: requiresId }, select: { itemId: true } });
      if (!required || required.itemId !== itemId) {
        throw new BadRequestException('La mejora requerida tiene que ser del mismo objeto');
      }
    }
  }

  async create(actor: Actor, itemId: string, dto: CreateItemUpgradeDto) {
    await this.assertCanManage(actor, itemId);
    const states = [...new Set(dto.unlockStates)];
    await this.validateStates(itemId, states, dto.requiresId);
    try {
      return await this.prisma.itemUpgrade.create({
        data: {
          itemId,
          key: dto.key,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          priceCoins: dto.priceCoins,
          unlockStates: states,
          requiresId: dto.requiresId || null,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Ya existe una mejora con esa clave en este objeto');
      }
      throw error;
    }
  }

  async update(actor: Actor, upgradeId: string, dto: UpdateItemUpgradeDto) {
    const upgrade = await this.prisma.itemUpgrade.findUnique({ where: { id: upgradeId } });
    if (!upgrade) throw new NotFoundException('Mejora no encontrada');
    await this.assertCanManage(actor, upgrade.itemId);
    if (dto.requiresId === upgradeId) throw new BadRequestException('Una mejora no puede requerirse a sí misma');
    const states = dto.unlockStates ? [...new Set(dto.unlockStates)] : undefined;
    if (states || dto.requiresId) {
      await this.validateStates(upgrade.itemId, states ?? upgrade.unlockStates, dto.requiresId);
    }
    return this.prisma.itemUpgrade.update({
      where: { id: upgradeId },
      data: {
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : dto.description?.trim() || null,
        priceCoins: dto.priceCoins,
        unlockStates: states,
        requiresId: dto.requiresId === undefined ? undefined : dto.requiresId || null,
        sortOrder: dto.sortOrder,
        active: dto.active,
      },
    });
  }

  // Con compras hechas no se borra (los jugadores perderían lo que pagaron):
  // se desactiva, y los que ya la tienen la conservan.
  async remove(actor: Actor, upgradeId: string) {
    const upgrade = await this.prisma.itemUpgrade.findUnique({
      where: { id: upgradeId },
      include: { _count: { select: { purchases: true } } },
    });
    if (!upgrade) throw new NotFoundException('Mejora no encontrada');
    await this.assertCanManage(actor, upgrade.itemId);
    if (upgrade._count.purchases > 0) {
      await this.prisma.itemUpgrade.update({ where: { id: upgradeId }, data: { active: false } });
      return { deactivated: true };
    }
    await this.prisma.itemUpgrade.delete({ where: { id: upgradeId } });
    return { deleted: true };
  }
}
