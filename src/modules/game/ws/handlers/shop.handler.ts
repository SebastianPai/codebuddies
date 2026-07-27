import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

import { ItemsService } from '../../items/items.service';
import { BackgroundsService } from '../../backgrounds/backgrounds.service';

@Injectable()
export class ShopHandler {
  private readonly logger = new Logger(ShopHandler.name);

  constructor(
    private readonly itemsService: ItemsService,
    private readonly backgroundsService: BackgroundsService,
  ) {}

  // ====================== OBTENER ITEMS DE LA TIENDA ======================
  async handleShopItemsRequest(
    socket: Socket,
    data: {
      sort?: 'new' | 'old' | 'cheap' | 'expensive' | 'popular';
      category?: string;
      minPrice?: number;
      maxPrice?: number;
    },
  ) {
    try {
      const items = await this.itemsService.getShopItems(data || {});
      const userId = socket.data.user?.userId;
      const backgrounds = userId
        ? await this.backgroundsService.listAvailableForUser(userId, {
            shop: 'true',
          })
        : [];

      const formatted = items.map((i: any) => {
        const translation = i.translations?.[0] || {};

        return {
          id: i.id,
          type: i.type,
          name: translation.name ?? null,
          description: translation.description ?? null,
          imageUrl: i.imageUrl,
          layer: i.layer,
          rarity: i.rarity,
          colorable: i.colorable,

          // Datos para avatar
          slot: i.avatarData?.slot ?? null,
          avatarData: i.avatarData ?? null,

          // Datos para mundo
          kind: i.worldData?.kind ?? null,
          worldData: i.worldData ?? null,

          coinsPrice: i.coinsPrice ?? 0,
          gemsPrice: i.gemsPrice ?? 0,

          shopVisible: i.shopVisible,
          category: i.category,
          views: i.views ?? 0,
          popularity: i.popularity ?? 0,

          createdAt: i.createdAt,
        };
      });

      const formattedBackgrounds = backgrounds.map((background: any) => ({
        id: background.id,
        type: 'BACKGROUND',
        name: background.name,
        description: background.description,
        imageUrl: background.previewUrl || background.imageUrl,
        backgroundImageUrl: background.imageUrl,
        coinsPrice: background.coinsPrice ?? 0,
        gemsPrice: background.gemsPrice ?? 0,
        shopVisible: background.shopVisible,
        category: background.category?.name ?? 'Fondos',
        accessType: background.accessType,
        canUse: background.canUse,
        owned: background.owned,
        lockedReason: background.lockedReason,
        createdAt: background.createdAt,
      }));

      socket.emit('shop:items', [...formatted, ...formattedBackgrounds]);
      this.logger.debug(`Enviados ${formatted.length} items al shop`);
    } catch (err: any) {
      this.logger.error('Error al obtener items del shop', err);
      socket.emit('shop:items:error', {
        message: err.message || 'No se pudieron cargar los items de la tienda',
      });
    }
  }

  // ====================== COMPRAR ITEM ======================
  async handleBuyItem(socket: Socket, data: { itemId: string }) {
    const userId = socket.data.user?.userId;
    if (!userId) {
      return socket.emit('shop:item:error', { message: 'No autenticado' });
    }

    if (!data.itemId) {
      return socket.emit('shop:item:error', { message: 'ItemId es requerido' });
    }

    try {
      await this.itemsService.buyItem(userId, data.itemId);

      // Recargar inventario actualizado
      const inventory = await this.itemsService.getInventory(userId);

      // Enviar respuestas al cliente
      socket.emit('inventory:data', inventory);
      socket.emit('shop:item:bought', {
        itemId: data.itemId,
        message: 'Item comprado exitosamente',
      });

      this.logger.log(`Usuario ${userId} compró item ${data.itemId}`);
    } catch (err: any) {
      this.logger.error(`Error al comprar item ${data.itemId}`, err);
      socket.emit('shop:item:error', {
        message: err.message || 'No se pudo completar la compra',
      });
    }
  }

  async handleBuyBackground(socket: Socket, data: { backgroundId: string }) {
    const userId = socket.data.user?.userId;
    if (!userId) {
      return socket.emit('shop:item:error', { message: 'No autenticado' });
    }

    try {
      await this.backgroundsService.buyBackground(userId, data.backgroundId);
      socket.emit('shop:item:bought', {
        itemId: data.backgroundId,
        message: 'Fondo desbloqueado exitosamente',
      });
    } catch (err: any) {
      socket.emit('shop:item:error', {
        message: err.message || 'No se pudo desbloquear el fondo',
      });
    }
  }

  // ====================== (Opcional) BUSCAR ITEM ESPECÍFICO ======================
  async handleGetItemDetails(socket: Socket, data: { itemId: string }) {
    try {
      const item = await this.itemsService.findItemById(data.itemId);
      if (!item) {
        return socket.emit('shop:item:error', {
          message: 'Item no encontrado',
        });
      }

      const translation = item.translations?.[0] || {};

      const formattedItem = {
        id: item.id,
        type: item.type,
        name: translation.name,
        description: translation.description,
        imageUrl: item.imageUrl,
        coinsPrice: item.coinsPrice,
        gemsPrice: item.gemsPrice,
        rarity: item.rarity,
        colorable: item.colorable,
        avatarData: item.avatarData,
        worldData: item.worldData,
      };

      socket.emit('shop:item:details', formattedItem);
    } catch (err: any) {
      socket.emit('shop:item:error', {
        message: 'Error al obtener detalles del item',
      });
    }
  }
}
