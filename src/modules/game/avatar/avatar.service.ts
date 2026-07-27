import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AvatarSlotType } from '@prisma/client';

@Injectable()
export class AvatarService {
  constructor(private prisma: PrismaService) {}

  // ────────────────────────────────────────────────
  // Función de utilidad: parsea string → AvatarSlotType seguro
  // ────────────────────────────────────────────────
  private parseSlot(slot: string): AvatarSlotType {
    const upperSlot = slot.toUpperCase();
    if (!Object.values(AvatarSlotType).includes(upperSlot as AvatarSlotType)) {
      throw new Error(`Slot inválido: ${slot}`);
    }
    return upperSlot as AvatarSlotType;
  }

  // ────────────────────────────────────────────────
  // Obtener avatar completo del usuario
  // ────────────────────────────────────────────────
  // En AvatarService

  // ────────────────────────────────────────────────
  // Obtener avatar completo del usuario (corregido)
  // ────────────────────────────────────────────────
  async getUserAvatar(userId: string) {
    const avatar = await this.prisma.avatar.findUnique({
      where: { userId },
      include: {
        slots: {
          include: {
            item: {
              include: {
                sprites: {
                  include: {
                    animation: true,
                  },
                },
                translations: true,
                // Opcional: si en algún momento necesitas saber el slot "diseñado" para ese item
                // avatarData: true,
              },
            },
          },
        },
      },
    });

    if (!avatar) {
      throw new NotFoundException(
        'Avatar no encontrado y no se pudo crear automáticamente',
      );
      // O bien: return this.createDefaultAvatar(userId); ← si prefieres
    }

    return avatar;
  }

  // ────────────────────────────────────────────────
  // Asegura que el avatar existe (lo usas en equip, update, etc)
  // ────────────────────────────────────────────────
  private async ensureAvatar(userId: string) {
    let avatar = await this.prisma.avatar.findUnique({
      where: { userId },
    });

    if (!avatar) {
      avatar = await this.prisma.avatar.create({
        data: {
          userId,
          skinColor: 0, // o el color por defecto que prefieras
        },
      });
    }

    return avatar;
  }

  async equipItem(
    userId: string,
    slot: string,
    itemId: string | null, // ← ahora es itemId directamente (del modelo Item)
    color?: number | null,
  ) {
    const avatar = await this.ensureAvatar(userId);
    const parsedSlot = this.parseSlot(slot);

    if (!itemId || itemId === '0') {
      await this.prisma.avatarSlot.deleteMany({
        where: { avatarId: avatar.id, slot: parsedSlot },
      });
    } else {
      // Verificar que el item existe y es válido para avatars
      const item = await this.prisma.item.findUnique({
        where: { id: itemId },
        include: { avatarData: true }, // para validar que tenga avatarData si quieres ser estricto
      });

      if (!item) {
        throw new NotFoundException('Item no encontrado');
      }

      // Opcional: validar que el item esté diseñado para ese slot
      // if (item.avatarData?.slot !== parsedSlot) {
      //   throw new BadRequestException('Este item no corresponde al slot indicado');
      // }

      await this.prisma.avatarSlot.upsert({
        where: { avatarId_slot: { avatarId: avatar.id, slot: parsedSlot } },
        update: { itemId, color: color ?? null },
        create: {
          avatarId: avatar.id,
          slot: parsedSlot,
          itemId,
          color: color ?? null,
        },
      });

      await this.prisma.marketplacePurchase.updateMany({
        where: {
          buyerId: userId,
          itemId,
        },
        data: {
          useCount: { increment: 1 },
          usedAt: new Date(),
          equippedAt: new Date(),
        },
      });
    }

    return this.getUserAvatar(userId);
  }

  // ────────────────────────────────────────────────
  // Actualizar el color de piel
  // ────────────────────────────────────────────────
  async updateSkinColor(userId: string, skinColor: number) {
    await this.ensureAvatar(userId);

    await this.prisma.avatar.update({
      where: { userId },
      data: { skinColor },
    });

    return this.getUserAvatar(userId);
  }

  // ────────────────────────────────────────────────
  // Desequipar un item de un slot
  // ────────────────────────────────────────────────
  async unequipItem(userId: string, slot: string) {
    // Llamamos a equipItem pasando null
    return this.equipItem(userId, slot, null);
  }

  // ────────────────────────────────────────────────
  // Actualizar avatar completo (slots + skinColor)
  // ────────────────────────────────────────────────
  async updateAvatar(userId: string, data: Record<string, any>) {
    await this.ensureAvatar(userId);

    // Actualizar skinColor si viene
    if ('skinColor' in data && typeof data.skinColor === 'number') {
      await this.prisma.avatar.update({
        where: { userId },
        data: { skinColor: data.skinColor },
      });
    }

    // Actualizar slots
    if ('slots' in data && Array.isArray(data.slots)) {
      const avatarId = (
        await this.prisma.avatar.findUniqueOrThrow({ where: { userId } })
      ).id;

      for (const slotData of data.slots) {
        const { slot: slotStr, itemId, color } = slotData;
        const slot = this.parseSlot(slotStr);

        if (itemId === null || itemId === '0') {
          await this.prisma.avatarSlot.deleteMany({
            where: { avatarId, slot },
          });
        } else {
          await this.prisma.avatarSlot.upsert({
            where: { avatarId_slot: { avatarId, slot } },
            update: {
              itemId,
              color: color ?? undefined, // 🔥 CLAVE
            },
            create: {
              avatarId,
              slot,
              itemId,
              color: color ?? null, // 🔥 CLAVE
            },
          });
        }
      }
    }

    return this.getUserAvatar(userId);
  }
}
