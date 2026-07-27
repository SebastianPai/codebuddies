import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

import { ItemsService } from '../../items/items.service';

@Injectable()
export class InventoryHandler {
  private readonly logger = new Logger(InventoryHandler.name);

  constructor(private readonly itemsService: ItemsService) {}

  // ====================== OBTENER INVENTARIO ======================
  async handleGetInventory(socket: Socket) {
    const userId = socket.data.user?.userId;
    if (!userId) {
      return socket.emit('inventory:error', {
        message: 'Usuario no autenticado',
      });
    }

    try {
      const inventory = await this.itemsService.getInventory(userId);

      const formattedInventory = inventory.map((invItem: any) => {
        const item = invItem.item || invItem;
        const translation = item.translations?.[0] || {};

        return {
          id: invItem.id,
          itemId: item.id,
          name: translation.name ?? item.name ?? 'Sin nombre',
          description: translation.description,
          imageUrl: item.imageUrl,
          type: item.type,
          rarity: item.rarity,
          colorable: item.colorable,
          slot: item.avatarData?.slot,
          amount: invItem.amount ?? invItem.quantity ?? 1,
          quantity: invItem.amount ?? invItem.quantity ?? 1,
          obtainedAt: invItem.createdAt,
          // Datos útiles para equipar
          avatarData: item.avatarData,
          worldData: item.worldData,
          item: {
            id: item.id,
            name: translation.name ?? item.name ?? 'Sin nombre',
            description: translation.description,
            imageUrl: item.imageUrl,
            type: item.type,
            rarity: item.rarity,
            colorable: item.colorable,
            avatarData: item.avatarData,
            worldData: item.worldData,
          },
        };
      });

      socket.emit('inventory:data', formattedInventory);

      this.logger.debug(
        `Inventario enviado a ${userId} → ${formattedInventory.length} items`,
      );
    } catch (err: any) {
      this.logger.error(`Error al obtener inventario de ${userId}`, err);
      socket.emit('inventory:error', {
        message: err.message || 'No se pudo cargar el inventario',
      });
    }
  }

  // ====================== USAR ITEM DESDE INVENTARIO ======================
  async handleUseItem(socket: Socket, data: { itemId: string; slot?: string }) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const inventory = await this.itemsService.getInventory(userId);

      const inventoryItem = inventory.find((i) => i.itemId === data.itemId);
      if (!inventoryItem) {
        return socket.emit('inventory:error', {
          message: 'Item no encontrado en tu inventario',
        });
      }

      const item = inventoryItem.item;

      // Si es un item para avatar, sugerir equiparlo
      if (item?.avatarData?.slot) {
        socket.emit('avatar:equip:request', {
          slot: data.slot || item.avatarData.slot,
          itemId: data.itemId,
        });
      } else {
        // Item de mundo o consumible
        socket.emit('inventory:itemUsed', {
          itemId: data.itemId,
          success: true,
        });
      }

      // Refrescar inventario después de usar
      const updatedInventory = await this.itemsService.getInventory(userId);
      socket.emit('inventory:data', updatedInventory);
    } catch (err: any) {
      this.logger.error('Error usando item', err);
      socket.emit('inventory:error', { message: 'No se pudo usar el item' });
    }
  }

  // ====================== ELIMINAR ITEM ======================
  async handleDeleteItem(socket: Socket, data: { itemId: string }) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const updatedInventory = await this.itemsService.getInventory(userId);
      socket.emit('inventory:data', updatedInventory);

      socket.emit('inventory:itemDeleted', { itemId: data.itemId });
      this.logger.log(`Item eliminado del inventario: ${data.itemId}`);
    } catch (err: any) {
      socket.emit('inventory:error', {
        message: err.message || 'No se pudo eliminar el item',
      });
    }
  }

  // ====================== MOVER ITEM (futuro) ======================
  async handleMoveItem(socket: Socket, data: any) {
    socket.emit('inventory:error', {
      message: 'Mover items dentro del inventario aún no está implementado',
    });
  }
}
