import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UserButler } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Un mayordomo por usuario. A diferencia de la mascota no tiene stats ni
// decaimiento: solo look (npcKey) + sala activa. El comportamiento (deambular
// + frases) vive en el cliente; el catálogo/assets en NpcConfig.
@Injectable()
export class ButlerService {
  constructor(private prisma: PrismaService) {}

  private serialize(butler: UserButler) {
    return {
      id: butler.id,
      npcKey: butler.npcKey,
      name: butler.name,
      activeRoomId: butler.activeRoomId,
    };
  }

  private async loadOwned(userId: string): Promise<UserButler> {
    const butler = await this.prisma.userButler.findUnique({ where: { userId } });
    if (!butler) throw new NotFoundException('No tenés un mayordomo');
    return butler;
  }

  async getMine(userId: string) {
    const butler = await this.prisma.userButler.findUnique({ where: { userId } });
    return butler ? this.serialize(butler) : null;
  }

  // Compra desde la tienda del juego: cobra coins y crea el mayordomo.
  async buyFromShop(userId: string, npcKey: string, name?: string) {
    const npc = await this.prisma.npcConfig.findUnique({
      where: { key: String(npcKey) },
    });
    if (!npc || !npc.enabled || npc.kind !== 'BUTLER' || !npc.shopVisible) {
      throw new NotFoundException('Mayordomo no disponible');
    }
    const price = npc.coinsPrice ?? 0;
    if (price <= 0) {
      throw new BadRequestException('Este mayordomo no está a la venta');
    }

    const existing = await this.prisma.userButler.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new BadRequestException('Ya tenés un mayordomo');
    }

    const butler = await this.prisma.$transaction(async (tx) => {
      // Débito condicional (compare-and-swap): dos compras concurrentes no
      // pueden dejar el saldo negativo — mismo patrón que PetService.
      const debited = await tx.user.updateMany({
        where: { id: userId, coins: { gte: price } },
        data: { coins: { decrement: price } },
      });
      if (debited.count === 0) {
        throw new BadRequestException('No tenés monedas suficientes');
      }

      await tx.coinTransaction.create({
        data: { userId, amount: -price, reason: `butler:${npc.key}` },
      });

      return tx.userButler.create({
        data: {
          userId,
          npcKey: npc.key,
          name: (name ?? '').trim().slice(0, 24),
        },
      });
    });

    return this.serialize(butler);
  }

  async rename(userId: string, name: string) {
    const butler = await this.loadOwned(userId);
    const updated = await this.prisma.userButler.update({
      where: { id: butler.id },
      data: { name: (name ?? '').trim().slice(0, 24) },
    });
    return this.serialize(updated);
  }

  /** Sacar/guardar el mayordomo de una sala. `roomId = null` = guardarlo. */
  async setActiveRoom(userId: string, roomId: string | null) {
    const butler = await this.loadOwned(userId);
    const updated = await this.prisma.userButler.update({
      where: { id: butler.id },
      data: { activeRoomId: roomId },
    });
    return this.serialize(updated);
  }

  async release(userId: string) {
    const butler = await this.loadOwned(userId);
    await this.prisma.userButler.delete({ where: { id: butler.id } });
    return { released: true };
  }
}
