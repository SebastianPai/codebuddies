import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

import { ItemsService } from '../../items/items.service';
import { BackgroundsService } from '../../backgrounds/backgrounds.service';
import { PetService } from '../../pets/pet.service';
import { PetSpeciesService } from '../../pets/pet-species.service';
import {
  BuyBackgroundDto,
  BuyItemDto,
  GiftItemDto,
  ShopItemsRequestDto,
} from '../dto/shop.dto';
import { isKnownRarity, getRarityDefinition } from '../../../../common/economy';

// apps/game (Shop.tsx) traducía la rareza con su propia tabla numérica
// hardcodeada (0-3, sin Uncommon) -- ahora recibe la key canónica calculada
// acá desde la misma fuente que usa la validación de precios, y solo la usa
// para elegir qué string traducir. Nunca vuelve a declarar su propia tabla.
function resolveRarityKey(rarity: number | null | undefined): string {
  const value = typeof rarity === 'number' ? rarity : 0;
  return isKnownRarity(value)
    ? getRarityDefinition(value).key
    : getRarityDefinition(0).key;
}

@Injectable()
export class ShopHandler {
  private readonly logger = new Logger(ShopHandler.name);

  constructor(
    private readonly itemsService: ItemsService,
    private readonly backgroundsService: BackgroundsService,
    private readonly petService: PetService,
    private readonly petSpeciesService: PetSpeciesService,
  ) {}

  // ====================== OBTENER ITEMS DE LA TIENDA ======================
  async handleShopItemsRequest(socket: Socket, data: ShopItemsRequestDto) {
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
          rarityKey: resolveRarityKey(i.rarity),
          colorable: i.colorable,

          // Solo para type === "EFFECT" -- id de @codebuddies/visual-effects
          // que este item desbloquea (ver Shop.tsx pestaña "effects").
          effectKey: i.effectKey ?? null,

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

      const species = await this.petSpeciesService.listEnabled();
      const myPet = userId ? await this.petService.getMyPet(userId) : null;
      const ownedSpecies = myPet?.species ?? null;
      const formattedPets = species
        .filter((s: any) => s.shopVisible && (s.coinsPrice ?? 0) > 0)
        .map((s: any) => ({
          id: `pet:${s.key}`,
          speciesKey: s.key,
          type: 'PET',
          name: s.name,
          description: null,
          owned: !!myPet, // 1 mascota por usuario: si ya tenés una, no comprás otra
          ownedThis: ownedSpecies === s.key,
          // Config de sprite para que el cliente muestre solo el frame 0
          // (o la caminata), nunca la hoja entera.
          petSprite: {
            spriteSheetUrl: s.spriteSheetUrl,
            frameWidth: s.frameWidth,
            frameHeight: s.frameHeight,
            directions: s.directions,
            animations: s.animations ?? [],
          },
          coinsPrice: s.coinsPrice ?? 0,
          gemsPrice: s.gemsPrice ?? 0,
          rarity: 0,
          rarityKey: 'common',
          shopVisible: true,
          category: 'pets',
          createdAt: s.createdAt,
        }));

      socket.emit('shop:items', [
        ...formatted,
        ...formattedBackgrounds,
        ...formattedPets,
      ]);
      this.logger.debug(`Enviados ${formatted.length} items al shop`);
    } catch (err: any) {
      this.logger.error('Error al obtener items del shop', err);
      socket.emit('shop:items:error', {
        message: err.message || 'No se pudieron cargar los items de la tienda',
      });
    }
  }

  // ====================== COMPRAR ITEM ======================
  async handleBuyItem(socket: Socket, data: BuyItemDto) {
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

  // ====================== COMPRAR MASCOTA ======================
  async handleBuyPet(
    socket: Socket,
    data: { speciesKey?: string; name?: string },
  ) {
    const userId = socket.data.user?.userId;
    if (!userId) {
      return socket.emit('shop:item:error', { message: 'No autenticado' });
    }
    if (!data?.speciesKey) {
      return socket.emit('shop:item:error', {
        message: 'speciesKey es requerido',
      });
    }

    try {
      const pet = await this.petService.buyFromShop(
        userId,
        data.speciesKey,
        data.name,
      );
      socket.emit('pet:data', pet);
      socket.emit('shop:item:bought', {
        itemId: `pet:${data.speciesKey}`,
        message: 'Mascota adoptada',
      });
      this.logger.log(`Usuario ${userId} adoptó mascota ${data.speciesKey}`);
    } catch (err: any) {
      this.logger.warn(`Compra de mascota rechazada: ${err.message}`);
      socket.emit('shop:item:error', {
        message: err.message || 'No se pudo adoptar la mascota',
      });
    }
  }

  // ====================== REGALAR ITEM ======================
  async handleGiftItem(socket: Socket, data: GiftItemDto) {
    const userId = socket.data.user?.userId;
    if (!userId) {
      return socket.emit('shop:item:error', { message: 'No autenticado' });
    }
    if (!data.itemId || !data.recipientUsername) {
      return socket.emit('shop:item:error', {
        message: 'itemId y recipientUsername son requeridos',
      });
    }

    try {
      await this.itemsService.giftItem(
        userId,
        data.itemId,
        data.recipientUsername,
      );
      socket.emit('shop:item:gifted', {
        itemId: data.itemId,
        recipientUsername: data.recipientUsername,
        message: 'Regalo enviado exitosamente',
      });
      this.logger.log(
        `Usuario ${userId} regaló item ${data.itemId} a ${data.recipientUsername}`,
      );
    } catch (err: any) {
      this.logger.error(`Error al regalar item ${data.itemId}`, err);
      socket.emit('shop:item:error', {
        message: err.message || 'No se pudo enviar el regalo',
      });
    }
  }

  async handleBuyBackground(socket: Socket, data: BuyBackgroundDto) {
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
        rarityKey: resolveRarityKey(item.rarity),
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
