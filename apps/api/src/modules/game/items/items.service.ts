import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AvatarSlotType,
  ItemAccessType,
  WorldItemKind,
  ItemType,
  NotificationType,
} from '@prisma/client';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { buildWorldEngineData } from './engine-data.util';
import { buildSpriteOffsetData } from './sprite-offset.util';
import {
  buildBehaviorData,
  buildInteractionTypesData,
} from './world-behavior.util';
import { PremiumAccessService } from '../../premium-access/premium-access.service';
import {
  RARITY_DEFINITIONS,
  assertValidShopPrice,
} from '../../../common/economy';
import { NotificationsService } from '../../notifications/notifications.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { CHAT_BUBBLE_EFFECT_PREFIX } from '../../../common/economy/effect-access';

// Texto del regalo en la notificación: un item EFFECT puede ser un efecto de
// nombre o un tema de burbuja ("bubble:<id>", ver IdentityService).
function describeGiftedItem(effectKey: string | null | undefined): string {
  if (!effectKey) return 'un item';
  if (effectKey.startsWith(CHAT_BUBBLE_EFFECT_PREFIX)) {
    return `el tema de burbuja "${effectKey.slice(CHAT_BUBBLE_EFFECT_PREFIX.length)}"`;
  }
  return `el efecto de nombre "${effectKey}"`;
}

@Injectable()
export class ItemsService {
  constructor(
    private prisma: PrismaService,
    private premiumAccessService: PremiumAccessService,
    private notificationsService: NotificationsService,
    private realtimeService: RealtimeService,
  ) {}

  // Fuente única de verdad de rareza expuesta a los frontends (admin,
  // futuro Shop/Marketplace/Analytics) -- ver GET /items/rarity-catalog.
  getRarityCatalog() {
    return RARITY_DEFINITIONS;
  }

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
      maxStack = 1,
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
      effectKey,
      spriteOffsetX = 0,
      spriteOffsetY = 0,
      spriteOffsets,
      spriteOffsetSync,
      behavior,
    } = dto;

    if (slot && kind) {
      throw new BadRequestException(
        'No puedes especificar slot y kind al mismo tiempo',
      );
    }

    // Los items EFFECT no tienen "rareza" en el sentido de items de
    // avatar/mundo -- su precio no está bandeado por rarity (ver
    // packages/visual-effects/index.ts, son un eje de acceso aparte:
    // free/premium/ownable). Saltar la validación acá, no forzar una
    // rareza artificial solo para pasarla.
    if (!effectKey) {
      assertValidShopPrice(rarity, coinsPrice);
    }

    const item = await this.prisma.item.create({
      data: {
        imageUrl,
        layer,
        rarity,
        coinsPrice,
        gemsPrice,
        shopVisible,
        maxStack,
        category,
        tags,
        ...(accessType && { accessType }),
        colorable,
        effectKey,
        type: effectKey
          ? ItemType.EFFECT
          : slot
            ? ItemType.AVATAR
            : kind
              ? ItemType.WORLD
              : undefined,
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

      const optimizedFootprint = buildWorldEngineData({
        width,
        height,
        footprintWidth,
        footprintHeight,
        footprints,
        surfaces,
        faceCount: directions,
      });

      // Sin behavior en el DTO no se escribe la columna: el item nace
      // estático, que es el comportamiento de siempre.
      const behaviorData = buildBehaviorData(behavior);

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
          ...buildSpriteOffsetData({
            spriteOffsets,
            spriteOffsetSync,
            spriteOffsetX,
            spriteOffsetY,
          }),
          ...behaviorData,
          // Un behavior recién creado con click no sirve de nada si nadie
          // marcó "Interactuable" con CLICK en interactionTypes (columna que
          // hoy sólo edita /admin/world-items/:id): ver
          // `buildInteractionTypesData` en world-behavior.util.ts.
          ...buildInteractionTypesData(
            'behavior' in behaviorData ? behaviorData.behavior : undefined,
            { isInteractable, interactionTypes: [] },
          ),
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
        // La lista de /admin/items necesita el nombre real para
        // distinguir items -- antes solo tenía "Avatar: SHIRT" genérico
        // repetido para todos los items de un mismo slot.
        translations: {
          include: { language: true },
        },
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

  // Marca/desmarca este item como el default que se auto-equipa a todo
  // avatar nuevo para su slot (ver AvatarService.grantDefaultItems). Como
  // mucho un item por slot puede tener esto activo: al marcar uno, se le
  // saca el flag a cualquier otro que lo tuviera para ese mismo slot.
  async setDefaultForSlot(id: string, isDefault: boolean) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { avatarData: true },
    });

    if (!item) {
      throw new NotFoundException(`Item con ID ${id} no encontrado`);
    }

    if (!isDefault) {
      return this.prisma.item.update({
        where: { id },
        data: { isDefaultForSlot: null },
      });
    }

    const slot = item.avatarData?.slot;
    if (!slot) {
      throw new BadRequestException(
        'Solo un item de avatar (con slot definido) puede ser el default',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.item.updateMany({
        where: { isDefaultForSlot: slot, NOT: { id } },
        data: { isDefaultForSlot: null },
      });

      return tx.item.update({
        where: { id },
        data: { isDefaultForSlot: slot },
      });
    });
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
      spriteOffsetX,
      spriteOffsetY,
      spriteOffsets,
      spriteOffsetSync,
      behavior,
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
    // `behavior` ausente del DTO ⇒ la columna NO se toca (update parcial):
    // editar el precio de una TV no puede borrarle su máquina de estados.
    // `null` explícito sí la limpia y devuelve el objeto a estático.
    const behaviorUpdateData = buildBehaviorData(behavior);
    Object.assign(worldData, behaviorUpdateData);

    if ('behavior' in behaviorUpdateData) {
      // Sólo se consulta lo mínimo (2 columnas) y sólo cuando de verdad se
      // está escribiendo `behavior` en este PATCH — el resto de los guardados
      // (precio, descripción…) no pagan esta lectura extra. Ver
      // `buildInteractionTypesData` en world-behavior.util.ts: por qué hace
      // falta esto y no sólo el `behavior`.
      const currentFlags = await this.prisma.worldItemData.findUnique({
        where: { itemId: id },
        select: { isInteractable: true, interactionTypes: true },
      });

      Object.assign(
        worldData,
        buildInteractionTypesData(behaviorUpdateData.behavior, {
          isInteractable: isInteractable ?? currentFlags?.isInteractable,
          interactionTypes: currentFlags?.interactionTypes,
        }),
      );
    }
    if (
      spriteOffsetX !== undefined ||
      spriteOffsetY !== undefined ||
      spriteOffsets !== undefined ||
      spriteOffsetSync !== undefined
    ) {
      // `existing` para el update parcial: si el form solo cambia el sync
      // (sin re-mandar el mapa) hay que partir del mapa ya guardado.
      const existing = await this.prisma.worldItemData.findUnique({
        where: { itemId: id },
        select: {
          spriteOffsets: true,
          spriteOffsetSync: true,
          spriteOffsetX: true,
          spriteOffsetY: true,
        },
      });

      Object.assign(
        worldData,
        buildSpriteOffsetData({
          spriteOffsets,
          spriteOffsetSync,
          spriteOffsetX,
          spriteOffsetY,
          existing,
        }),
      );
    }

    if (
      width !== undefined ||
      height !== undefined ||
      footprintWidth !== undefined ||
      footprintHeight !== undefined ||
      footprints !== undefined ||
      surfaces !== undefined ||
      directions !== undefined
    ) {
      const existing = await this.prisma.worldItemData.findUnique({
        where: { itemId: id },
      });
      const optimizedFootprint = buildWorldEngineData({
        width: width ?? existing?.width ?? 1,
        height: height ?? existing?.height ?? 1,
        footprintWidth: footprintWidth ?? existing?.footprintWidth ?? 1,
        footprintHeight: footprintHeight ?? existing?.footprintHeight ?? 1,
        footprints: footprints ?? existing?.footprints,
        surfaces: surfaces ?? existing?.surfaces,
        faceCount: directions ?? existing?.directions ?? 4,
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

    // Solo valida si esta edición toca precio o rareza -- editar cualquier
    // otro campo (nombre, descripción, imagen...) de un item existente
    // nunca debe fallar por un precio legado que ya estaba fuera de rango
    // antes de esta fase (ver auditoría: ningún precio actual se tocó).
    if (itemData.coinsPrice !== undefined || itemData.rarity !== undefined) {
      const current = await this.prisma.item.findUnique({
        where: { id },
        select: { rarity: true, coinsPrice: true, effectKey: true },
      });
      if (!current) {
        throw new NotFoundException(`Item con ID ${id} no encontrado`);
      }
      // Ver comentario en createItem -- items EFFECT no validan precio
      // contra banda de rareza.
      if (!(itemData.effectKey ?? current.effectKey)) {
        const nextRarity = itemData.rarity ?? current.rarity;
        const nextCoinsPrice =
          itemData.coinsPrice !== undefined
            ? itemData.coinsPrice
            : current.coinsPrice;
        assertValidShopPrice(nextRarity, nextCoinsPrice);
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
  // accessType ya no es decorativo: cada valor tiene un comportamiento
  // explícito. FREE es la única puerta que hoy usan los 18 items reales;
  // PREMIUM/VIP/EVENT quedan implementados y con tests aunque todavía no
  // haya ningún item usándolos, para que dejen de ser una promesa vacía del
  // schema (ver auditoría de economía).
  async buyItem(userId: string, itemId: string, quantity = 1) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('La cantidad debe ser un entero mayor a 0');
    }

    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new NotFoundException('Item no encontrado');
    if (!item.shopVisible) throw new BadRequestException('Item no disponible');

    if (!item.coinsPrice || item.coinsPrice <= 0) {
      throw new BadRequestException('Este item no se puede comprar');
    }

    // El tope de unidades por operación es el mismo que el tope de stock
    // acumulado (Item.maxStack) -- no hay un límite "por compra" separado,
    // ver ItemEditor.tsx (admin) donde se configura este único valor.
    // Ropa/cuerpo/pelo (AVATAR) y efectos se tienen o no se tienen: siempre
    // 1, aunque el admin haya puesto otro maxStack (otro solo para regalar).
    const maxStack = effectiveMaxStack(item);
    if (quantity > maxStack) {
      throw new BadRequestException(
        maxStack === 1
          ? 'Este item es personal: solo puedes tener uno (puedes regalárselo a un amigo)'
          : `Solo puedes comprar hasta ${maxStack} unidad(es) de este item por operación`,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    switch (item.accessType) {
      case ItemAccessType.FREE:
        break;

      case ItemAccessType.PREMIUM: {
        const hasPremium =
          await this.premiumAccessService.hasPremiumAccess(userId);
        if (!hasPremium) {
          throw new ForbiddenException(
            'Este item requiere una suscripción Premium activa',
          );
        }
        break;
      }

      // No existe ningún sistema de VIP implementado en la app (no hay
      // suscripción/rol VIP en ningún otro lado del código) -- tratar VIP
      // como si fuera Premium acá sería inventar un acceso que nadie
      // otorgó nunca. Hasta que exista un VipAccessService real, un item
      // VIP simplemente no se vende por este flujo.
      case ItemAccessType.VIP:
        throw new BadRequestException(
          'Los items VIP no están disponibles para compra todavía',
        );

      // EVENT existe para objetos que se otorgan por participar de un
      // evento, no por pagar coins -- que tenga coinsPrice seteado no lo
      // habilita a comprarse por acá.
      case ItemAccessType.EVENT:
        throw new BadRequestException(
          'Este item es exclusivo de eventos y no está disponible en la tienda',
        );

      default:
        throw new BadRequestException('accessType de item desconocido');
    }

    const totalPrice = item.coinsPrice! * quantity;

    await this.prisma.$transaction(async (tx) => {
      // Débito condicional en una sola sentencia UPDATE...WHERE: si dos
      // compras del mismo usuario llegan a la vez, la segunda ve el saldo
      // ya descontado por la primera y no matchea el WHERE (count=0), en
      // vez de que ambas lean el saldo viejo y decrementen igual (doble
      // gasto / saldo negativo).
      const debited = await tx.user.updateMany({
        where: { id: userId, coins: { gte: totalPrice } },
        data: { coins: { decrement: totalPrice } },
      });

      if (debited.count === 0) {
        // Solo se paga esta lectura extra cuando la compra YA falló, para
        // poder avisar "con tu saldo alcanza para N" en vez de un genérico
        // "no alcanza" -- no reemplaza la guarda atómica de arriba.
        const current = await tx.user.findUnique({
          where: { id: userId },
          select: { coins: true },
        });
        const affordable = current
          ? Math.floor(current.coins / item.coinsPrice!)
          : 0;
        throw new BadRequestException(
          affordable > 0
            ? `No tienes monedas suficientes para comprar ${quantity} unidad(es). Con tu saldo actual puedes comprar hasta ${affordable}.`
            : 'No tienes monedas suficientes',
        );
      }

      await tx.coinTransaction.create({
        data: {
          userId,
          amount: -totalPrice,
          reason: `item:${itemId}${quantity > 1 ? `:x${quantity}` : ''}`,
        },
      });

      const existing = await tx.userItem.findUnique({
        where: { userId_itemId: { userId, itemId } },
      });

      if (existing) {
        const remaining = maxStack - existing.amount;
        if (remaining < quantity) {
          throw new BadRequestException(
            remaining > 0
              ? `Ya tienes ${existing.amount} de este item. Solo puedes comprar ${remaining} más (máximo ${maxStack}).`
              : maxStack === 1
                ? 'Ya tienes este item: es personal, solo puedes tener uno'
                : `Ya alcanzaste el máximo de este item (${maxStack})`,
          );
        }

        // Mismo patrón compare-and-swap que el débito de coins: solo
        // incrementa si todavía hay lugar bajo maxStack en el momento en
        // que el UPDATE corre -- una segunda compra concurrente que ya vio
        // amount cerca del tope no matchea el WHERE (count=0) y se rechaza,
        // en vez de las dos leyendo el mismo amount viejo e incrementando
        // por encima del límite.
        const stacked = await tx.userItem.updateMany({
          where: { userId, itemId, amount: { lte: maxStack - quantity } },
          data: { amount: { increment: quantity } },
        });

        if (stacked.count === 0) {
          throw new BadRequestException(
            `Ya alcanzaste el máximo de este item (${maxStack})`,
          );
        }
      } else {
        if (quantity > maxStack) {
          throw new BadRequestException(
            `Solo puedes comprar hasta ${maxStack} unidad(es) de este item`,
          );
        }
        // La unique constraint [userId, itemId] es la guarda real contra
        // una carrera en la primera compra: si dos requests concurrentes
        // llegan acá sin fila previa, solo uno de los dos INSERT gana: el
        // otro tira P2002 y aborta toda la transacción (coins incluidos),
        // sin dejar estado a medias.
        await tx.userItem.create({
          data: { userId, itemId, amount: quantity, source: 'shop' },
        });
      }
    });

    return { success: true, quantity, totalPrice };
  }

  // ───────────── GIFT ITEM ─────────────
  // Mismo criterio de acceso que buyItem: solo items FREE+shopVisible se
  // pueden regalar (evita que esto se vuelva un transfer genérico de
  // cualquier item -- ver ItemGift.effectKey / plan de entitlements de
  // efectos, que es el primer caso de uso real). El pago sale del que
  // regala; el UserItem se crea a nombre del destinatario.
  async giftItem(senderId: string, itemId: string, recipientUsername: string) {
    const recipient = await this.prisma.user.findUnique({
      where: { username: recipientUsername },
      select: { id: true, username: true },
    });
    if (!recipient)
      throw new NotFoundException('Usuario destinatario no encontrado');
    if (recipient.id === senderId) {
      throw new BadRequestException('No podés regalarte un item a vos mismo');
    }
    // Solo se regala a gente de la lista de amigos (amistad aceptada).
    const friends = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: senderId, addresseeId: recipient.id },
          { requesterId: recipient.id, addresseeId: senderId },
        ],
      },
      select: { id: true },
    });
    if (!friends) {
      throw new BadRequestException('Solo puedes regalar a jugadores de tu lista de amigos');
    }

    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item no encontrado');
    if (!item.shopVisible) throw new BadRequestException('Item no disponible');
    if (item.accessType !== ItemAccessType.FREE) {
      throw new BadRequestException('Este item no se puede regalar');
    }
    if (!item.coinsPrice || item.coinsPrice <= 0) {
      throw new BadRequestException('Este item no se puede regalar');
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
    });
    if (!sender) throw new NotFoundException('Usuario no encontrado');

    const result = await this.prisma.$transaction(async (tx) => {
      // Mismo débito condicional que buyItem -- ver comentario ahí.
      const debited = await tx.user.updateMany({
        where: { id: senderId, coins: { gte: item.coinsPrice! } },
        data: { coins: { decrement: item.coinsPrice! } },
      });
      if (debited.count === 0) {
        throw new BadRequestException('No tienes monedas suficientes');
      }

      await tx.coinTransaction.create({
        data: {
          userId: senderId,
          amount: -item.coinsPrice!,
          reason: `gift:${itemId}:${recipient.id}`,
        },
      });

      const existing = await tx.userItem.findUnique({
        where: { userId_itemId: { userId: recipient.id, itemId } },
      });

      if (existing) {
        const stacked = await tx.userItem.updateMany({
          where: {
            userId: recipient.id,
            itemId,
            amount: { lt: effectiveMaxStack(item) },
          },
          data: { amount: { increment: 1 } },
        });
        if (stacked.count === 0) {
          throw new BadRequestException(
            effectiveMaxStack(item) === 1
              ? 'Tu amigo ya tiene este item'
              : `El destinatario ya alcanzó el máximo de este item (${effectiveMaxStack(item)})`,
          );
        }
      } else {
        await tx.userItem.create({
          data: { userId: recipient.id, itemId, amount: 1, source: 'gift' },
        });
      }

      const gift = await tx.itemGift.create({
        data: {
          itemId,
          giftedById: senderId,
          recipientId: recipient.id,
          coinsSpent: item.coinsPrice!,
        },
      });

      return gift;
    });

    const notification = await this.notificationsService.create({
      userId: recipient.id,
      type: NotificationType.REWARD_GRANTED,
      title: 'Recibiste un regalo',
      body: `${sender.username} te regaló ${describeGiftedItem(item.effectKey)}.`,
      metadata: { itemId, giftId: result.id, giftedBy: senderId },
    });
    this.realtimeService.emitToUser(recipient.id, {
      type: 'notification:new',
      payload: { itemId, giftedBy: sender.username, notification },
    });

    return { success: true, giftId: result.id };
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
    await this.prisma.roomBuildFavorite.deleteMany({
      where: { userId, itemId },
    });

    return this.listBuildFavorites(userId);
  }
}

/**
 * Cuántas unidades de un item puede tener una persona. Lo que se viste
 * (AVATAR: cuerpo, pelo, ropa) y los efectos son únicos: tener dos no sirve
 * de nada. Los muebles (WORLD) sí se acumulan según Item.maxStack.
 */
export function effectiveMaxStack(item: { type: ItemType | string | null; maxStack: number }) {
  return item.type === ItemType.AVATAR || item.type === ItemType.EFFECT ? 1 : Math.max(1, item.maxStack);
}
