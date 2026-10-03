import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UserButler } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Un mayordomo por sala propia: se contrata estando en tu sala y vive ahí.
// "Guardarlo" lo oculta (activeRoomId = null) sin quitarle su sala. No tiene
// stats ni decaimiento: solo look (npcKey). El comportamiento (deambular +
// frases) vive en el cliente; el catálogo/assets en NpcConfig.
@Injectable()
export class ButlerService {
  constructor(private prisma: PrismaService) {}

  private serialize(butler: UserButler) {
    return {
      id: butler.id,
      npcKey: butler.npcKey,
      name: butler.name,
      roomId: butler.roomId,
      activeRoomId: butler.activeRoomId,
    };
  }

  private async assertOwnsRoom(userId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { ownerId: true } });
    if (!room) throw new NotFoundException('Sala no encontrada');
    if (room.ownerId !== userId) throw new ForbiddenException('Solo puedes tener mayordomo en tus propias salas');
  }

  /**
   * Mayordomo de esta sala. Un mayordomo de antes (sin sala y guardado) se
   * queda en la primera sala propia donde se pida.
   */
  private async findForRoom(userId: string, roomId: string) {
    const butler = await this.prisma.userButler.findUnique({ where: { userId_roomId: { userId, roomId } } });
    if (butler) return butler;
    const loose = await this.prisma.userButler.findFirst({ where: { userId, roomId: null } });
    if (!loose) return null;
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { ownerId: true } });
    if (room?.ownerId !== userId) return null;
    return this.prisma.userButler.update({ where: { id: loose.id }, data: { roomId } });
  }

  private async loadForRoom(userId: string, roomId: string | null | undefined): Promise<UserButler> {
    if (!roomId) throw new BadRequestException('Entra a una de tus salas');
    const butler = await this.findForRoom(userId, roomId);
    if (!butler) throw new NotFoundException('No tienes mayordomo en esta sala');
    return butler;
  }

  // Mayordomos "sacados" en una sala: visibles para cualquiera que entre.
  async listInRoom(roomId: string) {
    const butlers = await this.prisma.userButler.findMany({
      where: { activeRoomId: roomId },
      take: 20,
      include: { user: { select: { username: true } } },
    });
    return butlers.map((butler) => ({ ...this.serialize(butler), ownerUsername: butler.user.username }));
  }

  /** Mayordomo del usuario en esta sala (o null). Sin sala: el primero que tenga. */
  async getMine(userId: string, roomId?: string | null) {
    if (roomId) {
      const butler = await this.findForRoom(userId, roomId);
      return butler ? this.serialize(butler) : null;
    }
    const butler = await this.prisma.userButler.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
    return butler ? this.serialize(butler) : null;
  }

  /** Todos sus mayordomos (uno por sala). */
  async listMine(userId: string) {
    const butlers = await this.prisma.userButler.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    return butlers.map((butler) => this.serialize(butler));
  }

  // Compra desde la tienda del juego: cobra coins y crea el mayordomo de esta sala.
  async buyFromShop(userId: string, npcKey: string, name?: string, roomId?: string | null) {
    if (!roomId) throw new BadRequestException('Entra a una de tus salas para contratar un mayordomo');
    await this.assertOwnsRoom(userId, roomId);
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

    if (await this.findForRoom(userId, roomId)) {
      throw new BadRequestException('Esta sala ya tiene mayordomo');
    }

    const butler = await this.prisma.$transaction(async (tx) => {
      // Débito condicional (compare-and-swap): dos compras concurrentes no
      // pueden dejar el saldo negativo — mismo patrón que PetService.
      const debited = await tx.user.updateMany({
        where: { id: userId, coins: { gte: price } },
        data: { coins: { decrement: price } },
      });
      if (debited.count === 0) {
        throw new BadRequestException('No tienes monedas suficientes');
      }

      await tx.coinTransaction.create({
        data: { userId, amount: -price, reason: `butler:${npc.key}` },
      });

      // Nace "sacado" en su sala.
      return tx.userButler.create({
        data: {
          userId,
          npcKey: npc.key,
          name: (name ?? '').trim().slice(0, 24),
          roomId,
          activeRoomId: roomId,
        },
      });
    });

    return this.serialize(butler);
  }

  async rename(userId: string, roomId: string | null | undefined, name: string) {
    const butler = await this.loadForRoom(userId, roomId);
    const updated = await this.prisma.userButler.update({
      where: { id: butler.id },
      data: { name: (name ?? '').trim().slice(0, 24) },
    });
    return this.serialize(updated);
  }

  /** Sacar (visible) o guardar el mayordomo de su sala. */
  async setVisible(userId: string, roomId: string | null | undefined, visible: boolean) {
    const butler = await this.loadForRoom(userId, roomId);
    const updated = await this.prisma.userButler.update({
      where: { id: butler.id },
      data: { activeRoomId: visible ? butler.roomId : null },
    });
    return this.serialize(updated);
  }

  async release(userId: string, roomId: string | null | undefined) {
    const butler = await this.loadForRoom(userId, roomId);
    await this.prisma.userButler.delete({ where: { id: butler.id } });
    return { released: true };
  }
}
