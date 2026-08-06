import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AvatarSlotType, WorldItemKind, ItemType } from '@prisma/client';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  // ───────────── CREATE ITEM ─────────────
  async createItem(dto: CreateItemDto) {
    console.log('DTO RECIBIDO');
    console.log(dto);

    const {
      name,
      description,
      languageCode = 'es',
      imageUrl,
      layer = 0,
      rarity = 0,
      coinsPrice,
      gemsPrice,
      shopVisible = true,
      category,
      tags = [],
      accessType,
      colorable = false,
      slot,
      kind,
      width,
      height,
      footprintWidth = 1,
      footprintHeight = 1,
      isCollidable = false,
      walkable = false,
      isInteractable = false,
      rotatable = true,
      placementType,
      furnitureCategory,
      allowsStacking = false,
      canBeStacked = false,
      stackHeight = 1,
      maxStackHeight = 0,
      frameWidth,
      frameHeight,
      directions = 4,
      syncDirections = true,
      footprints,
      surfaces,
      itemSprite,
    } = dto;

    if (slot && kind) {
      throw new BadRequestException(
        'No puedes especificar slot y kind al mismo tiempo',
      );
    }

    const item = await this.prisma.item.create({
      data: {
        imageUrl,
        layer,
        rarity,
        coinsPrice,
        gemsPrice,
        shopVisible,
        category,
        tags,
        ...(accessType && { accessType }),
        colorable,
        type: slot ? ItemType.AVATAR : kind ? ItemType.WORLD : undefined,
      },
      include: {
        avatarData: true,
        worldData: true,
        sprites: true,
        translations: {
          include: {
            language: true,
          },
        },
      },
    });

    // ==========================
    // CREAR TRADUCCIÓN
    // ==========================
    if (name) {
      const language = await this.prisma.language.findUnique({
        where: {
          code: languageCode,
        },
      });

      if (!language) {
        throw new BadRequestException(`Idioma "${languageCode}" no encontrado`);
      }

      await this.prisma.itemTranslation.create({
        data: {
          itemId: item.id,
          languageId: language.id,
          name,
          description,
        },
      });
    }

    if (slot) {
      await this.prisma.avatarItemData.create({
        data: {
          itemId: item.id,
          slot,
        },
      });

      // Mismo enfoque simplificado (una sola dirección SOUTH) que el alta
      // de items desde el marketplace de creadores — ver
      // marketplace.service.ts#createPublishedItemFromContent.
      if (itemSprite?.imageUrl) {
        const animationName = String(itemSprite.animation || 'idle');
        const animation = await this.prisma.animation.findFirst({
          where: {
            OR: [
              { variant: animationName },
              { name: { contains: animationName, mode: 'insensitive' } },
            ],
          },
        });

        if (animation) {
          await this.prisma.itemSprite.create({
            data: {
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
    }

    if (kind) {
      if (!width || !height) {
        throw new BadRequestException(
          'width y height son requeridos para world items',
        );
      }

      const optimizedFootprint = this.buildEngineData({
        width,
        height,
        footprintWidth,
        footprintHeight,
        footprints,
        surfaces,
      });

      await this.prisma.worldItemData.create({
        data: {
          itemId: item.id,
          width,
          height,
          footprintWidth,
          footprintHeight,
          syncDirections,
          footprints: optimizedFootprint.footprints,
          surfaces: optimizedFootprint.surfaces,
          engineData: optimizedFootprint.engineData,
          kind,
          isCollidable,
          walkable,
          isInteractable,
          rotatable,
          ...(placementType && { placementType }),
          ...(furnitureCategory && { category: furnitureCategory }),
          allowsStacking,
          canBeStacked,
          stackHeight,
          maxStackHeight,
          frameWidth,
          frameHeight,
          directions,
        },
      });
    }

    return this.prisma.item.findUnique({
      where: {
        id: item.id,
      },
      include: {
        avatarData: true,
        worldData: true,
        sprites: true,
        translations: {
          include: {
            language: true,
          },
        },
      },
    });
  }

  // ───────────── ITEMS BASE ─────────────
  async findAllItems() {
    return this.prisma.item.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        avatarData: true,
        worldData: true,
        sprites: true,
      },
    });
  }

  async findItemById(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        avatarData: true,
        worldData: true,
        sprites: true,

        translations: {
          include: {
            language: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item con ID ${id} no encontrado`);
    }

    return item;
  }

  async updateItem(id: string, dto: UpdateItemDto) {
    const {
      slot,
      kind,
      width,
      height,
      footprintWidth,
      footprintHeight,
      isCollidable,
      walkable,
      isInteractable,
      rotatable,
      placementType,
      furnitureCategory,
      allowsStacking,
      canBeStacked,
      stackHeight,
      maxStackHeight,
      frameWidth,
      frameHeight,
      directions,
      syncDirections,
      footprints,
      surfaces,
      itemSprite,
      name,
      description,
      languageCode,
      ...itemData
    } = dto as any;

    if (name !== undefined) {
      const language = await this.prisma.language.findUnique({
        where: {
          code: languageCode ?? 'es',
        },
      });

      if (language) {
        await this.prisma.itemTranslation.upsert({
          where: {
            itemId_languageId: {
              itemId: id,
              languageId: language.id,
            },
          },
          update: {
            name,
            description,
          },
          create: {
            itemId: id,
            languageId: language.id,
            name,
            description,
          },
        });
      }
    }

    const worldData: any = {};

    if (kind !== undefined) worldData.kind = kind;
    if (width !== undefined) worldData.width = width;
    if (height !== undefined) worldData.height = height;
    if (isCollidable !== undefined) worldData.isCollidable = isCollidable;
    if (walkable !== undefined) worldData.walkable = walkable;
    if (isInteractable !== undefined) worldData.isInteractable = isInteractable;
    if (rotatable !== undefined) worldData.rotatable = rotatable;
    if (placementType !== undefined) worldData.placementType = placementType;
    if (furnitureCategory !== undefined) worldData.category = furnitureCategory;
    if (allowsStacking !== undefined) worldData.allowsStacking = allowsStacking;
    if (canBeStacked !== undefined) worldData.canBeStacked = canBeStacked;
    if (stackHeight !== undefined) worldData.stackHeight = stackHeight;
    if (maxStackHeight !== undefined) worldData.maxStackHeight = maxStackHeight;
    if (frameWidth !== undefined) worldData.frameWidth = frameWidth;
    if (frameHeight !== undefined) worldData.frameHeight = frameHeight;
    if (footprintWidth !== undefined) worldData.footprintWidth = footprintWidth;
    if (footprintHeight !== undefined)
      worldData.footprintHeight = footprintHeight;
    if (directions !== undefined) worldData.directions = directions;
    if (syncDirections !== undefined) worldData.syncDirections = syncDirections;
    if (footprints !== undefined) worldData.footprints = footprints;
    if (surfaces !== undefined) worldData.surfaces = surfaces;

    if (
      width !== undefined ||
      height !== undefined ||
      footprintWidth !== undefined ||
      footprintHeight !== undefined ||
      footprints !== undefined ||
      surfaces !== undefined
    ) {
      const existing = await this.prisma.worldItemData.findUnique({
        where: { itemId: id },
      });
      const optimizedFootprint = this.buildEngineData({
        width: width ?? existing?.width ?? 1,
        height: height ?? existing?.height ?? 1,
        footprintWidth: footprintWidth ?? existing?.footprintWidth ?? 1,
        footprintHeight: footprintHeight ?? existing?.footprintHeight ?? 1,
        footprints: footprints ?? existing?.footprints,
        surfaces: surfaces ?? existing?.surfaces,
      });

      worldData.footprints = optimizedFootprint.footprints;
      worldData.surfaces = optimizedFootprint.surfaces;
      worldData.engineData = optimizedFootprint.engineData;
    }

    if (slot !== undefined) {
      await this.prisma.avatarItemData.upsert({
        where: { itemId: id },
        update: { slot },
        create: { itemId: id, slot },
      });
    }

    if (itemSprite?.imageUrl) {
      const animationName = String(itemSprite.animation || 'idle');
      const animation = await this.prisma.animation.findFirst({
        where: {
          OR: [
            { variant: animationName },
            { name: { contains: animationName, mode: 'insensitive' } },
          ],
        },
      });

      if (animation) {
        await this.prisma.itemSprite.upsert({
          where: {
            itemId_animationId_direction: {
              itemId: id,
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
            itemId: id,
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

    if (Object.keys(worldData).length > 0) {
      const existing = await this.prisma.worldItemData.findUnique({
        where: { itemId: id },
      });

      if (existing) {
        await this.prisma.worldItemData.update({
          where: { itemId: id },
          data: worldData,
        });
      } else if (worldData.kind && worldData.width && worldData.height) {
        await this.prisma.worldItemData.create({
          data: {
            itemId: id,
            width: worldData.width,
            height: worldData.height,
            kind: worldData.kind,
            footprintWidth: worldData.footprintWidth,
            footprintHeight: worldData.footprintHeight,
            ...worldData,
          },
        });
      }
    }

    return this.prisma.item.update({
      where: { id },
      data: itemData,
      include: {
        avatarData: true,
        worldData: true,
        sprites: true,
      },
    });
  }

  async removeItem(id: string) {
    await this.prisma.avatarItemData.deleteMany({ where: { itemId: id } });
    await this.prisma.worldItemData.deleteMany({ where: { itemId: id } });

    return this.prisma.item.delete({ where: { id } });
  }

  private buildEngineData(data: {
    width?: number;
    height?: number;
    footprintWidth?: number;
    footprintHeight?: number;
    footprints?: any;
    surfaces?: any;
  }) {
    const directions = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
    const fallbackTiles = this.createRectTiles(
      Number(data.footprintWidth) || 1,
      Number(data.footprintHeight) || 1,
    );

    const normalizeMap = (source: any, fallback: any[]) => {
      const result: Record<string, any> = {};
      directions.forEach((direction) => {
        const entry = source?.[direction] || {};
        const occupied = this.normalizeTiles(entry.occupied, fallback);
        const origin = this.normalizeOrigin(entry.origin, occupied);

        result[direction] = {
          occupied,
          origin,
          bounds: this.calculateBounds(occupied),
        };
      });
      return result;
    };

    const normalizedFootprints = normalizeMap(data.footprints, fallbackTiles);
    const normalizedSurfaces = normalizeMap(data.surfaces, []);

    return {
      footprints: normalizedFootprints,
      surfaces: normalizedSurfaces,
      engineData: {
        frameWidth: Math.max(1, Math.floor((Number(data.width) || 4) / 4)),
        frameHeight: Number(data.height) || 1,
        tileSize: { width: 64, height: 32 },
        directions,
        footprints: normalizedFootprints,
        surfaces: normalizedSurfaces,
      },
    };
  }

  private createRectTiles(width: number, height: number) {
    const tiles: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < Math.max(1, height); y++) {
      for (let x = 0; x < Math.max(1, width); x++) {
        tiles.push({ x, y });
      }
    }
    return tiles;
  }

  private normalizeTiles(source: any, fallback: Array<{ x: number; y: number }>) {
    if (!Array.isArray(source)) return fallback;

    return source
      .map((tile) => ({ x: Number(tile?.x), y: Number(tile?.y) }))
      .filter((tile) => Number.isInteger(tile.x) && Number.isInteger(tile.y));
  }

  private normalizeOrigin(
    source: any,
    occupied: Array<{ x: number; y: number }>,
  ) {
    const origin = { x: Number(source?.x), y: Number(source?.y) };
    if (
      Number.isInteger(origin.x) &&
      Number.isInteger(origin.y) &&
      occupied.some((tile) => tile.x === origin.x && tile.y === origin.y)
    ) {
      return origin;
    }

    return occupied[0] || { x: 0, y: 0 };
  }

  private calculateBounds(tiles: Array<{ x: number; y: number }>) {
    if (!tiles.length) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    const xs = tiles.map((tile) => tile.x);
    const ys = tiles.map((tile) => tile.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  // ───────────── AVATAR ITEMS ─────────────
  async createAvatarItem(itemId: string, slot: AvatarSlotType) {
    return this.prisma.avatarItemData.create({
      data: { itemId, slot },
      include: { item: true },
    });
  }

  async findAllAvatarItems() {
    return this.prisma.avatarItemData.findMany({
      include: { item: true },
      orderBy: { item: { createdAt: 'desc' } },
    });
  }

  async findAvatarItemById(id: string) {
    const avatarItem = await this.prisma.avatarItemData.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!avatarItem) {
      throw new NotFoundException(`AvatarItem con ID ${id} no encontrado`);
    }

    return avatarItem;
  }

  async removeAvatarItem(id: string) {
    return this.prisma.avatarItemData.delete({ where: { id } });
  }

  // ───────────── WORLD ITEMS ─────────────
  async createWorldItem(
    itemId: string,
    width: number,
    height: number,
    kind: WorldItemKind,
    isCollidable = false,
    isInteractable = false,
  ) {
    return this.prisma.worldItemData.create({
      data: {
        itemId,
        width,
        height,
        kind,
        isCollidable,
        isInteractable,
      },
      include: { item: true },
    });
  }

  async findAllWorldItems() {
    return this.prisma.worldItemData.findMany({
      include: { item: true },
      orderBy: { item: { createdAt: 'desc' } },
    });
  }

  async findWorldItemById(id: string) {
    const worldItem = await this.prisma.worldItemData.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!worldItem) {
      throw new NotFoundException(`WorldItem con ID ${id} no encontrado`);
    }

    return worldItem;
  }

  async removeWorldItem(id: string) {
    return this.prisma.worldItemData.delete({ where: { id } });
  }

  // ───────────── FILTER ─────────────
  async findByType(type: string) {
    const lower = type.toLowerCase();

    if (lower === 'avatar') return this.findAllAvatarItems();
    if (lower === 'world') return this.findAllWorldItems();

    return this.findAllItems();
  }

  // ───────────── INVENTORY ─────────────
  async getInventory(userId: string) {
    return this.prisma.userItem.findMany({
      where: { userId },

      include: {
        item: {
          include: {
            avatarData: true,

            worldData: true,

            translations: {
              include: {
                language: true,
              },
            },
          },
        },
      },
    });
  }

  // ───────────── BUY ITEM (FIXED) ─────────────
  async buyItem(userId: string, itemId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new NotFoundException('Item no encontrado');
    if (!item.shopVisible) throw new BadRequestException('Item no disponible');

    if (!item.coinsPrice || item.coinsPrice <= 0) {
      throw new BadRequestException('Este item no se puede comprar');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.$transaction(async (tx) => {
      // Debito condicional en una sola sentencia UPDATE...WHERE: si dos
      // compras del mismo usuario llegan a la vez, la segunda ve el saldo
      // ya descontado por la primera y no matchea el WHERE (count=0), en
      // vez de que ambas lean el saldo viejo y decrementen igual (doble
      // gasto / saldo negativo).
      const debited = await tx.user.updateMany({
        where: { id: userId, coins: { gte: item.coinsPrice! } },
        data: { coins: { decrement: item.coinsPrice! } },
      });

      if (debited.count === 0) {
        throw new BadRequestException('No tienes monedas suficientes');
      }

      await tx.userItem.upsert({
        where: {
          userId_itemId: { userId, itemId },
        },
        update: {
          amount: { increment: 1 },
        },
        create: {
          userId,
          itemId,
          amount: 1,
          source: 'shop',
        },
      });
    });

    return { success: true };
  }

  // ───────────── SHOP (FIXED FILTERS) ─────────────
  async getShopItems(query: {
    sort?: 'new' | 'old' | 'cheap' | 'expensive' | 'popular';
    category?: string;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const orderBy: any = {};

    switch (query.sort) {
      case 'new':
        orderBy.createdAt = 'desc';
        break;
      case 'old':
        orderBy.createdAt = 'asc';
        break;
      case 'cheap':
        orderBy.coinsPrice = 'asc';
        break;
      case 'expensive':
        orderBy.coinsPrice = 'desc';
        break;
      case 'popular':
        orderBy.popularity = 'desc';
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    const priceFilter: any = {};

    if (query.minPrice !== undefined) priceFilter.gte = query.minPrice;
    if (query.maxPrice !== undefined) priceFilter.lte = query.maxPrice;

    return this.prisma.item.findMany({
      where: {
        shopVisible: true,
        category: query.category,
        ...(Object.keys(priceFilter).length ? { coinsPrice: priceFilter } : {}),
      },
      orderBy,
      include: {
        avatarData: true,
        worldData: true,
        translations: {
          include: {
            language: true,
          },
        },
      },
    });
  }

  // ───────────── FAVORITOS DEL INVENTARIO DE CONSTRUCCIÓN ─────────────
  // Distinto de MarketplaceFavorite (que es sobre publicaciones del
  // marketplace) — esto es "qué muebles marcaste con estrella en tu propio
  // inventario de construcción", server-side para que persista entre
  // sesiones/dispositivos (a diferencia de "recientes", que es solo
  // localStorage).
  async listBuildFavorites(userId: string) {
    const favorites = await this.prisma.roomBuildFavorite.findMany({
      where: { userId },
      select: { itemId: true },
    });

    return favorites.map((favorite) => favorite.itemId);
  }

  async addBuildFavorite(userId: string, itemId: string) {
    await this.prisma.roomBuildFavorite.upsert({
      where: { userId_itemId: { userId, itemId } },
      update: {},
      create: { userId, itemId },
    });

    return this.listBuildFavorites(userId);
  }

  async removeBuildFavorite(userId: string, itemId: string) {
    await this.prisma.roomBuildFavorite.deleteMany({ where: { userId, itemId } });

    return this.listBuildFavorites(userId);
  }
}
