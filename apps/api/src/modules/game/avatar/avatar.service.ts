import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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
  // Crea el avatar si no existe (con los defaults por slot ya
  // auto-equipados) y devuelve el avatar completo. Pensado para el punto
  // de entrada del juego (ver player.handler.ts ensureDefaultAvatar) --
  // reemplaza un intento anterior que equipaba un itemId hardcodeado "1"
  // (nunca un UUID real), fallaba siempre con ForbiddenException, y por
  // eso el avatar terminaba completamente vacío/invisible en todos los
  // slots, no solo BODY.
  // ────────────────────────────────────────────────
  async getOrCreateAvatarWithDefaults(userId: string) {
    await this.ensureAvatar(userId);
    return this.getUserAvatar(userId);
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

      // Solo en la creación del avatar (nunca sobre uno ya existente):
      // auto-equipa el item marcado como default de cada slot que tenga
      // uno configurado, para que un usuario que nunca pasó por el editor
      // de avatar no quede con partes invisibles. También se le otorga
      // como UserItem propio -- "equipado" en este código siempre implica
      // "poseído" (ver equipItem), y así el item también le aparece en su
      // inventario, no solo puesto.
      await this.grantDefaultItems(userId, avatar.id);
    }

    return avatar;
  }

  private async grantDefaultItems(userId: string, avatarId: string) {
    const defaults = await this.prisma.item.findMany({
      where: { isDefaultForSlot: { not: null } },
    });

    for (const item of defaults) {
      const slot = item.isDefaultForSlot;
      if (!slot) continue;

      await this.prisma.userItem.upsert({
        where: { userId_itemId: { userId, itemId: item.id } },
        update: {},
        create: { userId, itemId: item.id, amount: 1 },
      });

      await this.prisma.avatarSlot.upsert({
        where: { avatarId_slot: { avatarId, slot } },
        update: {},
        create: { avatarId, slot, itemId: item.id },
      });
    }
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

      // Verificar que el usuario realmente posee este item (antes se podía
      // equipar cualquier cosmético existente sin haberlo comprado nunca,
      // saltándose por completo la tienda/marketplace).
      const owned = await this.prisma.userItem.findUnique({
        where: { userId_itemId: { userId, itemId } },
      });

      if (!owned || owned.amount <= 0) {
        throw new ForbiddenException('No tienes este item en tu inventario');
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
          // Misma verificación de propiedad que equipItem: esta ruta
          // (actualización masiva de slots) equipaba items sin comprobar
          // el inventario del usuario.
          const owned = await this.prisma.userItem.findUnique({
            where: { userId_itemId: { userId, itemId } },
          });

          if (!owned || owned.amount <= 0) {
            throw new ForbiddenException(
              `No tienes el item ${itemId} en tu inventario`,
            );
          }

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
