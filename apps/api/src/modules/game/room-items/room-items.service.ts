import { canUseColor } from '@codebuddies/world-objects';
import { PremiumAccessService } from '../../premium-access/premium-access.service';
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InteractionType, PlacementType, WallSide } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  EffectivePermissions,
  resolveEffectivePermissions,
} from '../rooms/room-permissions.util';
import { resolveDirectionalFootprints } from '../items/engine-data.util';
import {
  buildPersistedState,
  effectiveStateKey,
  isTransitionInFlight,
  readBehavior,
  applyLockedStates,
  readPersistedState,
  resolveTrigger,
  toRemoteUpdate,
  writePersistedState,
  type RemoteStateUpdate,
} from '@codebuddies/world-objects';

import {
  lockedStatesForOwner,
  lockedStatesForPairs,
} from '../../item-upgrades/item-upgrades.util';

// Tope de altura de un bloque pegado al costado de otro. Igual que
// DEFAULT_MAX_STACK_HEIGHT del juego (PlacementValidator.ts).
const SIDE_ATTACH_MAX_ELEVATION = 5;

// Lo que se puede poner gratis en la sala de diseño: lo que se vende en la
// tienda con monedas (lo de eventos o VIP no, porque no se podría pagar
// después al hacerlo real).
function isDesignable(item: {
  shopVisible: boolean;
  coinsPrice: number | null;
  accessType: string;
}) {
  return (
    item.shopVisible &&
    (item.coinsPrice ?? 0) > 0 &&
    (item.accessType === 'FREE' || item.accessType === 'PREMIUM')
  );
}

// Punto de aparición: categoría "spawn". Cada sala tiene uno; el diseño
// predeterminado (tag spawn:default, lo elige el admin) no se compra ni se
// guarda en inventario. Otros diseños sí: se compran y reemplazan al actual.
export const SPAWN_CATEGORY = 'spawn';
export const SPAWN_DEFAULT_TAG = 'spawn:default';
const isSpawnItem = (item: any) => item?.category === SPAWN_CATEGORY;
const isDefaultSpawn = (item: any) =>
  isSpawnItem(item) && Array.isArray(item?.tags) && item.tags.includes(SPAWN_DEFAULT_TAG);

type DesignQuoteLine = {
  itemId: string;
  needed: number;
  have: number;
  missing: number;
  price: number;
  cost: number;
  buyable: boolean;
};

@Injectable()
export class RoomItemsService {
  constructor(
    private prisma: PrismaService,
    private premiumAccess: PremiumAccessService,
  ) {}

  async getRoomItems(roomId: string) {
    const roomItems = await this.prisma.roomItem.findMany({
      where: {
        roomId,
      },
      include: {
        item: {
          include: {
            worldData: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
    return this.withEffectiveBehaviors(roomItems);
  }

  // Cada objeto viaja con el behavior EFECTIVO de su dueño: los estados de
  // mejoras que no compró quedan inalcanzables (ver
  // packages/world-objects/upgrades.ts). Es solo para que el juego muestre
  // bien qué se puede clickear; la validación real es resolveBehaviorClick.
  private async withEffectiveBehaviors<
    T extends { userId: string; itemId: string; item: { worldData: { behavior?: unknown } | null } },
  >(roomItems: T[]): Promise<T[]> {
    const withBehavior = roomItems.filter((ri) => ri.item.worldData?.behavior);
    if (withBehavior.length === 0) return roomItems;
    const locked = await lockedStatesForPairs(
      this.prisma,
      withBehavior.map((ri) => ({ ownerId: ri.userId, itemId: ri.itemId })),
    );
    if (locked.size === 0) return roomItems;
    return roomItems.map((ri) => {
      const states = locked.get(`${ri.userId}:${ri.itemId}`);
      const behavior = states?.length ? readBehavior(ri.item.worldData?.behavior) : null;
      if (!behavior || !states?.length) return ri;
      return {
        ...ri,
        item: {
          ...ri.item,
          worldData: { ...ri.item.worldData, behavior: applyLockedStates(behavior, states) },
        },
      };
    });
  }

  // Único punto de lectura de permisos para este servicio — comparte el
  // mismo resolver puro que rooms.service.ts (room-permissions.util.ts) en
  // vez de repetir acá un chequeo de tier fijo por separado.
  private async getEffectivePermissions(
    userId: string,
    roomId: string,
  ): Promise<EffectivePermissions> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Sala no encontrada');
    }

    if (room.ownerId === userId) {
      return resolveEffectivePermissions(true, null);
    }

    const permission = await this.prisma.roomPermission.findUnique({
      where: {
        roomId_userId: { roomId, userId },
      },
      include: { customRole: true },
    });

    return resolveEffectivePermissions(false, permission);
  }

  /**
   * Huella del mueble para una rotación concreta.
   *
   * Delega en `resolveDirectionalFootprints`, EL MISMO resolvedor que usa
   * `buildWorldEngineData` al persistir y que el cliente usa al leer
   * (apps/game/.../iso/footprintRotation.ts). Antes esta función tenía su
   * propia copia de las reglas, con dos divergencias respecto del cliente:
   *
   *   1. `origin` se tomaba crudo (`Number(origin?.x) || 0`) sin comprobar
   *      que perteneciera a `occupied`. Con un origin inválido, el servidor
   *      reservaba unas casillas y el cliente bloqueaba otras.
   *   2. El fallback rotaba el rectángulo pero la rama principal no, así
   *      que un item con engineData relleno nunca rotaba su huella.
   *
   * No reescribe nada persistido: sólo unifica cómo se LEE.
   */
  private getFootprint(worldData: any, rotation = 0, state?: any) {
    const directions = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
    const direction = directions[((rotation % 4) + 4) % 4];

    const rawWidth =
      Number(state?.footprintWidth ?? worldData?.footprintWidth) || 1;
    const rawHeight =
      Number(state?.footprintHeight ?? worldData?.footprintHeight) || 1;
    const width = Math.max(1, Math.min(rawWidth, 8));
    const height = Math.max(1, Math.min(rawHeight, 8));

    const source =
      worldData?.engineData?.footprints ?? worldData?.footprints ?? null;

    const resolved = resolveDirectionalFootprints(
      source,
      this.createRectTiles(width, height),
    )[direction];

    const xs = resolved.occupied.map((tile) => tile.x);
    const ys = resolved.occupied.map((tile) => tile.y);

    return {
      width: xs.length ? Math.max(...xs) - Math.min(...xs) + 1 : 1,
      height: ys.length ? Math.max(...ys) - Math.min(...ys) + 1 : 1,
      origin: resolved.origin,
      occupied: resolved.occupied,
    };
  }

  private createRectTiles(width: number, height: number) {
    const tiles: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        tiles.push({ x, y });
      }
    }
    return tiles;
  }

  private toWorldTiles(x: number, y: number, footprint: any) {
    const origin = footprint.origin || { x: 0, y: 0 };
    return footprint.occupied.map((tile) => ({
      x: x + tile.x - origin.x,
      y: y + tile.y - origin.y,
    }));
  }

  private overlaps(
    a: Array<{ x: number; y: number }>,
    b: Array<{ x: number; y: number }>,
  ) {
    const bSet = new Set(b.map((tile) => `${tile.x},${tile.y}`));
    return a.some((tile) => bSet.has(`${tile.x},${tile.y}`));
  }

  private isSurfaceRoomItem(roomItem: any) {
    const kind = roomItem.item?.worldData?.kind;
    const state = roomItem.state;

    return state?.surface || kind === 'FLOOR' || kind === 'WALL';
  }

  // Lock advisory de Postgres, scopeado a la transacción (se libera solo al
  // hacer commit/rollback, sin unlock manual) y a este roomId puntual — no
  // bloquea nada en otras salas. Sin esto, las comprobaciones de ocupación
  // de placeItem/paintSurface/moveItem/rotateItem/clearRoom corrían bajo
  // READ COMMITTED sin ningún SELECT...FOR UPDATE ni constraint única en
  // (roomId,x,y): dos peticiones concurrentes sobre la misma sala podían
  // leer ambas "sin ocupantes" antes de que ninguna confirmara, y las dos
  // insertar — superponiendo muebles pese a que la validación decía que no
  // se podía. hashtext() castea implícito de int4 a bigint.
  private async lockRoomForWrite(tx: any, roomId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${roomId}))`;
  }

  private async getOccupyingItems(
    tx: any,
    roomId: string,
    x: number,
    y: number,
    footprint: any,
    ignoreRoomItemId?: string,
  ) {
    const roomItems = await tx.roomItem.findMany({
      where: {
        roomId,
        wallSide: null,
        ...(ignoreRoomItemId && {
          id: {
            not: ignoreRoomItemId,
          },
        }),
      },
      include: {
        item: {
          include: {
            worldData: true,
          },
        },
      },
    });

    const target = this.toWorldTiles(x, y, footprint);

    return roomItems.filter((roomItem) => {
      if (this.isSurfaceRoomItem(roomItem)) return false;

      const footprint = this.getFootprint(
        roomItem.item.worldData,
        roomItem.rotation,
        roomItem.state,
      );

      return this.overlaps(
        target,
        this.toWorldTiles(roomItem.x, roomItem.y, footprint),
      );
    });
  }

  async placeItem(
    userId: string,
    roomId: string,
    itemId: string,
    x: number,
    y: number,
    rotation = 0,
    wallSide?: WallSide,
    wallOffset?: number,
    // Color elegido antes de colocar (solo items colorable). null = original.
    color: number | null = null,
    // Altura para pegar un bloque al costado de otro, flotando. Solo se
    // acepta si la casilla está libre y un vecino directo es un bloque a
    // exactamente esa altura (validado abajo, dentro de la transacción).
    sideElevation?: number,
  ) {
    const permissions = await this.getEffectivePermissions(userId, roomId);

    if (!permissions.canPlaceObjects) {
      throw new ForbiddenException('No puedes modificar esta sala');
    }

    await this.assertColorAllowed(userId, color);

    const floating = !wallSide && !!sideElevation && sideElevation > 0;

    if (floating) {
      // El bloque flotante no puede salirse del mapa: la sala no se expande.
      const grid = await this.getRoomGridSize(roomId);
      if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
        throw new BadRequestException('Posición fuera de los límites de la sala');
      }
      if (sideElevation > SIDE_ATTACH_MAX_ELEVATION) {
        throw new BadRequestException('Demasiado alto');
      }
    }

    const design = await this.isDesignRoom(roomId);

    return this.prisma.$transaction(async (tx) => {
      await this.lockRoomForWrite(tx, roomId);

      const inventoryItem = await tx.userItem.findUnique({
        where: {
          userId_itemId: {
            userId,
            itemId,
          },
        },
      });

      const item = await tx.item.findUnique({
        where: {
          id: itemId,
        },
        include: {
          worldData: true,
        },
      });

      // En la sala de diseño se coloca gratis lo que se tiene o lo que se
      // puede comprar; fuera de ella hace falta tenerlo en el inventario.
      const owned = !!inventoryItem && inventoryItem.amount > 0;
      if (!owned && !(design && item && isDesignable(item))) {
        throw new ForbiddenException('No tienes este objeto en inventario');
      }

      if (!item?.worldData) {
        throw new BadRequestException('Este item no se puede colocar en salas');
      }

      if (color !== null && !item.colorable) {
        throw new BadRequestException('Este objeto no se puede colorear');
      }

      // Otro diseño de punto de aparición: reemplaza al que había (que vuelve
      // al inventario si no era el predeterminado y no es la sala de diseño).
      if (isSpawnItem(item)) {
        const previous = await tx.roomItem.findMany({
          where: { roomId, item: { category: SPAWN_CATEGORY } },
          include: { item: true },
        });
        await tx.roomItem.deleteMany({
          where: { id: { in: previous.map((roomItem) => roomItem.id) } },
        });
        for (const old of previous) {
          if (design || isDefaultSpawn(old.item)) continue;
          await tx.userItem.upsert({
            where: { userId_itemId: { userId, itemId: old.itemId } },
            update: { amount: { increment: 1 } },
            create: { userId, itemId: old.itemId, amount: 1 },
          });
        }
      }

      const isWallItem =
        item.worldData.placementType === PlacementType.WALL ||
        item.worldData.placementType === PlacementType.BOTH ||
        item.worldData.kind === 'WALL';

      if (item.worldData.placementType === PlacementType.WALL && !wallSide) {
        throw new BadRequestException('Este objeto necesita una pared');
      }

      const normalizedRotation = ((rotation % 4) + 4) % 4;
      const footprint = this.getFootprint(item.worldData, normalizedRotation);

      const occupyingItems = wallSide
        ? []
        : await this.getOccupyingItems(tx, roomId, x, y, footprint);

      let elevation = 0;
      let parentRoomItemId: string | undefined;

      if (floating) {
        if (
          occupyingItems.length > 0 ||
          !item.worldData.canBeStacked ||
          footprint.width !== 1 ||
          footprint.height !== 1
        ) {
          throw new BadRequestException('No puedes colocar ese objeto ahí');
        }

        const neighbors = await tx.roomItem.findMany({
          where: {
            roomId,
            wallSide: null,
            elevation: sideElevation,
            OR: [
              { x: x + 1, y },
              { x: x - 1, y },
              { x, y: y + 1 },
              { x, y: y - 1 },
            ],
          },
          include: { item: { include: { worldData: true } } },
        });

        const touchesBlock = neighbors.some(
          (neighbor) =>
            !this.isSurfaceRoomItem(neighbor) &&
            (neighbor.item.worldData?.canBeStacked ||
              neighbor.item.worldData?.allowsStacking),
        );

        if (!touchesBlock) {
          throw new BadRequestException('No hay un bloque al lado a esa altura');
        }

        elevation = sideElevation;
      } else if (!wallSide && occupyingItems.length > 0) {
        const stackTarget = occupyingItems
          .filter((roomItem) => roomItem.item.worldData?.allowsStacking)
          .sort((a, b) => b.elevation - a.elevation)[0];

        if (
          !stackTarget ||
          !item.worldData.canBeStacked ||
          footprint.width !== 1 ||
          footprint.height !== 1
        ) {
          throw new BadRequestException('No puedes colocar ese objeto ahí');
        }

        const targetData = stackTarget.item.worldData;
        const nextElevation =
          stackTarget.elevation + (targetData?.stackHeight ?? 1);

        if (
          targetData?.maxStackHeight &&
          nextElevation > targetData.maxStackHeight
        ) {
          throw new BadRequestException('La pila ya alcanzó su altura máxima');
        }

        elevation = nextElevation;
        parentRoomItemId = stackTarget.id;
      }

      const roomItem = await tx.roomItem.create({
        data: {
          roomId,
          userId,
          itemId,

          x,
          y,

          rotation: normalizedRotation,

          elevation,
          zIndex: elevation,
          parentRoomItemId,
          wallSide: isWallItem ? wallSide : undefined,
          wallOffset: isWallItem ? wallOffset : undefined,
          color,
        },
        include: {
          item: {
            include: {
              worldData: true,
            },
          },
        },
      });

      if (design || !inventoryItem) return roomItem;

      await tx.marketplacePurchase.updateMany({
        where: {
          buyerId: userId,
          itemId,
        },
        data: {
          useCount: { increment: 1 },
          usedAt: new Date(),
          placedAt: new Date(),
        },
      });

      if (inventoryItem.amount === 1) {
        await tx.userItem.delete({
          where: {
            userId_itemId: {
              userId,
              itemId,
            },
          },
        });
      } else {
        await tx.userItem.update({
          where: {
            userId_itemId: {
              userId,
              itemId,
            },
          },
          data: {
            amount: {
              decrement: 1,
            },
          },
        });
      }

      return roomItem;
    });
  }

  async paintSurface(
    userId: string,
    roomId: string,
    itemId: string,
    x: number,
    y: number,
    width = 1,
    height = 1,
    wallSide?: WallSide,
    // Permite a paintAllSurface reusar un único fetch del grid en vez de
    // repetirlo por cada tile del loop.
    precomputedGrid?: { width: number; height: number },
  ) {
    const permissions = await this.getEffectivePermissions(userId, roomId);

    // Pintar una pared es un permiso distinto de pintar el piso — un rol
    // "Decorador" podría tener uno sin el otro.
    if (!(wallSide ? permissions.canChangeWalls : permissions.canChangeFloor)) {
      throw new ForbiddenException('No puedes modificar esta sala');
    }

    const safeWidth = Math.max(1, Math.min(Number(width) || 1, 8));
    const safeHeight = Math.max(1, Math.min(Number(height) || 1, 8));

    const grid = precomputedGrid ?? (await this.getRoomGridSize(roomId));

    if (
      x < 0 ||
      y < 0 ||
      x + safeWidth > grid.width ||
      y + safeHeight > grid.height
    ) {
      throw new BadRequestException('Posición fuera de los límites de la sala');
    }

    const design = await this.isDesignRoom(roomId);

    return this.prisma.$transaction(async (tx) => {
      await this.lockRoomForWrite(tx, roomId);

      const inventoryItem = await tx.userItem.findUnique({
        where: {
          userId_itemId: {
            userId,
            itemId,
          },
        },
      });

      const item = await tx.item.findUnique({
        where: {
          id: itemId,
        },
        include: {
          worldData: true,
        },
      });

      const owned = !!inventoryItem && inventoryItem.amount > 0;
      if (!owned && !(design && item && isDesignable(item))) {
        throw new ForbiddenException('No tienes esta textura en inventario');
      }

      const kind = item?.worldData?.kind;
      const isFloorTexture = kind === 'FLOOR';
      const isWallTexture = kind === 'WALL';

      if (!item?.worldData || (!isFloorTexture && !isWallTexture)) {
        throw new BadRequestException('Este item no es una textura');
      }

      if (isWallTexture && !wallSide) {
        throw new BadRequestException('La textura de pared necesita wallSide');
      }

      const sameSurfaceItems = await tx.roomItem.findMany({
        where: {
          roomId,
          ...(isWallTexture ? { wallSide } : { wallSide: null }),
        },
        include: {
          item: {
            include: {
              worldData: true,
            },
          },
        },
      });

      const removedIds = sameSurfaceItems
        .filter((surface) => surface.item.worldData?.kind === kind)
        .filter((surface) => {
          const state = surface.state as any;
          const surfaceWidth = Number(state?.width) || 1;
          const surfaceHeight = Number(state?.height) || 1;

          const leftA = x;
          const rightA = x + safeWidth - 1;
          const topA = y;
          const bottomA = y + safeHeight - 1;
          const leftB = surface.x;
          const rightB = surface.x + surfaceWidth - 1;
          const topB = surface.y;
          const bottomB = surface.y + surfaceHeight - 1;

          return (
            leftA <= rightB &&
            rightA >= leftB &&
            topA <= bottomB &&
            bottomA >= topB
          );
        })
        .map((surface) => surface.id);

      if (removedIds.length > 0) {
        await tx.roomItem.deleteMany({
          where: {
            id: {
              in: removedIds,
            },
          },
        });
      }

      const surface = await tx.roomItem.create({
        data: {
          roomId,
          userId,
          itemId,
          x,
          y,
          rotation: 0,
          elevation: 0,
          zIndex: isWallTexture ? 5 : -1,
          wallSide: isWallTexture ? wallSide : null,
          wallOffset: 0,
          state: {
            surface: true,
            width: safeWidth,
            height: safeHeight,
          },
        },
        include: {
          item: {
            include: {
              worldData: true,
            },
          },
        },
      });

      return {
        surface,
        removedIds,
      };
    });
  }

  async moveItem(
    userId: string,
    roomItemId: string,
    x: number,
    y: number,
    rotation?: number,
  ) {
    const roomItem = await this.prisma.roomItem.findUnique({
      where: {
        id: roomItemId,
      },
      include: {
        room: true,
        item: {
          include: {
            worldData: true,
          },
        },
      },
    });

    if (!roomItem) {
      throw new NotFoundException('Objeto no encontrado');
    }

    const permissions = await this.getEffectivePermissions(
      userId,
      roomItem.roomId,
    );

    if (!permissions.canMoveObjects) {
      throw new ForbiddenException('No puedes mover objetos aquí');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.lockRoomForWrite(tx, roomItem.roomId);

      const nextRotation =
        rotation === undefined ? roomItem.rotation : ((rotation % 4) + 4) % 4;

      if (!roomItem.wallSide && !this.isSurfaceRoomItem(roomItem)) {
        const footprint = this.getFootprint(
          roomItem.item.worldData,
          nextRotation,
          roomItem.state,
        );
        const occupyingItems = await this.getOccupyingItems(
          tx,
          roomItem.roomId,
          x,
          y,
          footprint,
          roomItemId,
        );

        if (occupyingItems.length > 0) {
          throw new BadRequestException('No puedes mover el objeto ahi');
        }
      }

      return tx.roomItem.update({
        where: {
          id: roomItemId,
        },
        data: {
          x,
          y,
          rotation: nextRotation,
        },
        include: {
          item: {
            include: {
              worldData: true,
            },
          },
        },
      });
    });
  }

  async rotateItem(userId: string, roomItemId: string) {
    const roomItem = await this.prisma.roomItem.findUnique({
      where: {
        id: roomItemId,
      },
      include: {
        item: {
          include: {
            worldData: true,
          },
        },
      },
    });

    if (!roomItem) {
      throw new NotFoundException('Objeto no encontrado');
    }

    const permissions = await this.getEffectivePermissions(
      userId,
      roomItem.roomId,
    );

    if (!permissions.canRotateObjects) {
      throw new ForbiddenException('No puedes rotar este objeto');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.lockRoomForWrite(tx, roomItem.roomId);

      const nextRotation = (roomItem.rotation + 1) % 4;

      if (!roomItem.wallSide && !this.isSurfaceRoomItem(roomItem)) {
        const footprint = this.getFootprint(
          roomItem.item.worldData,
          nextRotation,
          roomItem.state,
        );
        const occupyingItems = await this.getOccupyingItems(
          tx,
          roomItem.roomId,
          roomItem.x,
          roomItem.y,
          footprint,
          roomItemId,
        );

        if (occupyingItems.length > 0) {
          throw new BadRequestException('No puedes rotar el objeto ahi');
        }
      }

      return tx.roomItem.update({
        where: {
          id: roomItemId,
        },
        data: {
          rotation: nextRotation,
        },
        include: {
          item: {
            include: {
              worldData: true,
            },
          },
        },
      });
    });
  }

  // Paleta general (ropa/objetos): free para todos, premium con suscripción.
  private async assertColorAllowed(userId: string, color: number | null) {
    if (canUseColor('COLOR', color, false)) return;
    const hasPremium = await this.premiumAccess.hasPremiumAccess(userId);
    if (canUseColor('COLOR', color, hasPremium)) return;
    throw new ForbiddenException(
      hasPremium ? 'Ese color no existe en la paleta.' : 'Ese color es Premium.',
    );
  }

  // ====================== COLOREAR UN OBJETO ======================
  // Solo objetos marcados "Coloreable" en el admin (Item.colorable). Mismo
  // permiso que rotar (es decoración de la sala) y misma paleta que la ropa
  // del avatar: free para todos, premium con suscripción (ver
  // packages/world-objects/palettes.ts). color null = sprite original.
  async colorItem(userId: string, roomItemId: string, color: number | null) {
    const roomItem = await this.prisma.roomItem.findUnique({
      where: { id: roomItemId },
      include: { item: { select: { colorable: true } } },
    });

    if (!roomItem) {
      throw new NotFoundException('Objeto no encontrado');
    }
    if (!roomItem.item.colorable) {
      throw new BadRequestException('Este objeto no se puede colorear');
    }

    const permissions = await this.getEffectivePermissions(userId, roomItem.roomId);
    if (!permissions.canRotateObjects) {
      throw new ForbiddenException('No puedes colorear este objeto');
    }

    await this.assertColorAllowed(userId, color);

    return this.prisma.roomItem.update({
      where: { id: roomItemId },
      data: { color },
      include: { item: { include: { worldData: true } } },
    });
  }

  // ====================== INTERACTUAR CON UN OBJETO ======================
  // Distinto de mover/rotar/retirar: interactuar (sentarse, encender la TV,
  // abrir una puerta) NO requiere permisos de edición — cualquiera que esté
  // en la sala puede hacerlo. Solo cambia `state` (Json dinámico del
  // RoomItem), nunca la posición ni el inventario.
  async interactItem(
    _userId: string,
    roomItemId: string,
    interaction: InteractionType,
  ) {
    const roomItem = await this.prisma.roomItem.findUnique({
      where: { id: roomItemId },
      include: { item: { include: { worldData: true } } },
    });

    if (!roomItem) {
      throw new NotFoundException('Objeto no encontrado');
    }

    const worldData = roomItem.item.worldData;
    if (!worldData?.isInteractable) {
      throw new BadRequestException('Este objeto no es interactivo');
    }
    if (!worldData.interactionTypes.includes(interaction)) {
      throw new BadRequestException(
        `Este objeto no admite la interacción ${interaction}`,
      );
    }

    const currentState =
      roomItem.state && typeof roomItem.state === 'object'
        ? (roomItem.state as Record<string, unknown>)
        : {};

    // CLICK es el único camino que pasa por la máquina declarativa. Todo lo
    // demás — TOGGLE, OPEN, SIT, LIE, DRINK, TELEPORT — sigue exactamente por
    // donde iba, sin un solo cambio.
    if (interaction === InteractionType.CLICK) {
      return this.resolveBehaviorClick(roomItem, currentState);
    }

    let nextState: Record<string, unknown> = currentState;

    if (interaction === InteractionType.TOGGLE) {
      nextState = { ...currentState, on: !currentState.on };
    } else if (interaction === InteractionType.OPEN) {
      nextState = { ...currentState, open: !currentState.open };
    } else {
      // SIT / LIE / DRINK: el efecto sobre el avatar lo maneja el cliente
      // (pose + posición); acá no hay estado de objeto que persistir.
      return { roomItem, state: currentState, interaction };
    }

    const updated = await this.prisma.roomItem.update({
      where: { id: roomItemId },
      data: { state: nextState as any },
      include: { item: { include: { worldData: true } } },
    });

    return { roomItem: updated, state: nextState, interaction };
  }

  /**
   * CLICK resuelto contra `WorldItemData.behavior`.
   *
   * ─────────────────────────────────────────────────────────────────────
   * EL SERVIDOR ES LA ÚNICA FUENTE DE VERDAD
   *
   * El cliente sólo dice "hice click". Quién decide que de OFF se pasa a ON, y
   * por qué animación, es esto. Toda la lógica de la máquina vive en
   * @codebuddies/world-objects — el MISMO módulo que ejecuta el juego, así que
   * no hay dos implementaciones que se puedan desincronizar.
   *
   * ─────────────────────────────────────────────────────────────────────
   * LO QUE SE PERSISTE NO ES "EL ESTADO"
   *
   * Es el estado estable MÁS la transición en curso con su instante de
   * arranque (ver persistence.ts). Guardar `ON` de una vez haría que quien
   * entre durante los ~400 ms de `turn_on` viera la TV ya encendida mientras
   * quien la clickeó la ve encenderse.
   *
   * La animación NO se reproduce acá: el servidor sólo dice cuál hay que
   * reproducir y desde cuándo.
   */
  private async resolveBehaviorClick(
    roomItem: {
      id: string;
      userId: string;
      itemId: string;
      item: { worldData: { behavior?: unknown } | null };
    },
    currentState: Record<string, unknown>,
  ) {
    const fullBehavior = readBehavior(roomItem.item.worldData?.behavior);
    // Mejoras: los estados que el dueño del objeto no desbloqueó no se
    // pueden alcanzar (la TV sin "Encendido" no prende). Se decide acá, en
    // el servidor, así que no se puede saltar desde el cliente.
    const behavior = fullBehavior
      ? applyLockedStates(
          fullBehavior,
          await lockedStatesForOwner(this.prisma, roomItem.userId, roomItem.itemId),
        )
      : null;

    if (!behavior) {
      throw new BadRequestException(
        'Este objeto no tiene un comportamiento configurado',
      );
    }

    const now = Date.now();
    const persisted = readPersistedState(currentState);

    // ── anti click-spam, del lado del servidor ──
    //
    // Mientras una transición no terminó, los clicks siguientes no hacen nada.
    // Sale del dato persistido y no de un contador en memoria, así que vale
    // para TODOS los jugadores de la sala a la vez (no sólo para el socket que
    // clickeó), sobrevive a un reinicio del proceso y no se puede saltar
    // desde el cliente. Un bucle (`onComplete: REPEAT`) no bloquea, o el
    // objeto quedaría inutilizable para siempre.
    if (isTransitionInFlight(behavior, persisted, now)) {
      return this.unchangedBehaviorResult(roomItem, currentState, persisted);
    }

    const fromState = effectiveStateKey(behavior, persisted, now);
    const resolution = resolveTrigger(behavior, fromState, 'CLICK');

    // No hay transición para (estado, CLICK): no-op seguro. No es un error —
    // un objeto en un estado sin salidas simplemente no reacciona — así que no
    // se escribe ni se difunde nada.
    if (!resolution) {
      return this.unchangedBehaviorResult(roomItem, currentState, persisted);
    }

    const nextPersisted = buildPersistedState(resolution, fromState, now);
    const nextState = writePersistedState(currentState, nextPersisted);

    const updated = await this.prisma.roomItem.update({
      where: { id: roomItem.id },
      data: { state: nextState as any },
      include: { item: { include: { worldData: true } } },
    });

    return {
      roomItem: updated,
      state: nextState,
      interaction: InteractionType.CLICK,
      changed: true,
      // Lo que el cliente necesita para animar: estado final, animación de
      // paso y cuándo arrancó. Es exactamente la forma que consume
      // `applyRemoteState()`.
      behavior: toRemoteUpdate(nextPersisted),
    };
  }

  /** Resultado de un CLICK que no cambió nada: no se escribe ni se difunde. */
  private unchangedBehaviorResult(
    roomItem: { id: string },
    currentState: Record<string, unknown>,
    persisted: ReturnType<typeof readPersistedState>,
  ) {
    return {
      roomItem: roomItem as any,
      state: currentState,
      interaction: InteractionType.CLICK,
      changed: false,
      behavior: persisted ? toRemoteUpdate(persisted) : (null as RemoteStateUpdate | null),
    };
  }

  async removeItem(userId: string, roomItemId: string) {
    const roomItem = await this.prisma.roomItem.findUnique({
      where: {
        id: roomItemId,
      },
    });

    if (!roomItem) {
      throw new NotFoundException('Objeto no encontrado');
    }

    const permissions = await this.getEffectivePermissions(
      userId,
      roomItem.roomId,
    );

    if (!permissions.canDeleteObjects) {
      throw new ForbiddenException('No puedes retirar objetos aquí');
    }

    // Lo de la sala de diseño nunca salió del inventario: quitarlo no
    // devuelve nada (si no, sería una fábrica de objetos gratis).
    const design = await this.isDesignRoom(roomItem.roomId);

    // El punto de aparición no se quita: se mueve. Si era un diseño comprado,
    // "quitarlo" lo devuelve al inventario y vuelve el predeterminado ahí mismo.
    const removedItem = await this.prisma.item.findUnique({
      where: { id: roomItem.itemId },
    });
    if (isSpawnItem(removedItem)) {
      if (isDefaultSpawn(removedItem)) {
        throw new BadRequestException(
          'El punto de aparición no se puede quitar: muévelo a donde quieras',
        );
      }
      const fallback = await this.findDefaultSpawnItem();
      if (!fallback) {
        throw new BadRequestException('El punto de aparición no se puede quitar');
      }
      return this.prisma.$transaction(async (tx) => {
        await tx.roomItem.delete({ where: { id: roomItemId } });
        if (!design) {
          await tx.userItem.upsert({
            where: { userId_itemId: { userId, itemId: roomItem.itemId } },
            update: { amount: { increment: 1 } },
            create: { userId, itemId: roomItem.itemId, amount: 1 },
          });
        }
        const replacement = await tx.roomItem.create({
          data: {
            roomId: roomItem.roomId,
            userId: roomItem.userId,
            itemId: fallback.id,
            x: roomItem.x,
            y: roomItem.y,
            rotation: 0,
            elevation: 0,
            zIndex: 0,
          },
          include: { item: { include: { worldData: true } } },
        });
        return { success: true, itemId: roomItem.itemId, replacement };
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.roomItem.delete({
        where: {
          id: roomItemId,
        },
      });

      if (design || this.isSurfaceRoomItem(roomItem)) {
        return { success: true, itemId: roomItem.itemId };
      }

      await tx.userItem.upsert({
        where: {
          userId_itemId: {
            userId,
            itemId: roomItem.itemId,
          },
        },
        update: {
          amount: {
            increment: 1,
          },
        },
        create: {
          userId,
          itemId: roomItem.itemId,
          amount: 1,
        },
      });

      return {
        success: true,
        itemId: roomItem.itemId,
      };
    });
  }

  async clearRoom(userId: string, roomId: string) {
    const permissions = await this.getEffectivePermissions(userId, roomId);

    // Vaciar TODA la sala de un golpe es una acción destructiva a nivel
    // administrativo — antes exclusiva de ADMIN (canClearRoom), ahora
    // equivalente a canManagePermissions (el mismo tier "de confianza alta").
    if (!permissions.canManagePermissions) {
      throw new ForbiddenException('No puedes vaciar esta sala');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.lockRoomForWrite(tx, roomId);

      const roomItems = await tx.roomItem.findMany({
        where: {
          roomId,
        },
        include: {
          item: {
            include: {
              worldData: true,
            },
          },
        },
      });

      const counts = new Map<string, number>();
      const design = await this.isDesignRoom(roomId);

      const keep = roomItems.filter((roomItem) => isSpawnItem(roomItem.item));

      roomItems.forEach((roomItem) => {
        if (design || this.isSurfaceRoomItem(roomItem) || isSpawnItem(roomItem.item)) return;

        counts.set(roomItem.itemId, (counts.get(roomItem.itemId) ?? 0) + 1);
      });

      for (const [itemId, amount] of counts) {
        await tx.userItem.upsert({
          where: {
            userId_itemId: {
              userId,
              itemId,
            },
          },
          update: {
            amount: {
              increment: amount,
            },
          },
          create: {
            userId,
            itemId,
            amount,
          },
        });
      }

      await tx.roomItem.deleteMany({
        where: {
          roomId,
          id: { notIn: keep.map((roomItem) => roomItem.id) },
        },
      });

      return {
        success: true,
        removedCount: roomItems.length - keep.length,
        // El cliente vacía todo al recibir esto: le devolvemos lo que quedó.
        kept: keep,
      };
    });
  }

  async paintAllSurface(
    userId: string,
    roomId: string,
    itemId: string,
    width = 1,
    height = 1,
    onProgress?: (done: number, total: number) => void,
  ) {
    const permissions = await this.getEffectivePermissions(userId, roomId);

    // "Pintar todo" siempre pinta el piso (ver comentario de LobbyScene:
    // "🎨 Pintando todo el suelo"), nunca paredes.
    if (!permissions.canChangeFloor) {
      throw new ForbiddenException('No puedes modificar esta sala');
    }

    const safeWidth = Math.max(1, Math.min(Number(width) || 1, 8));
    const safeHeight = Math.max(1, Math.min(Number(height) || 1, 8));

    // El grid real (Tiled) es lo único válido para acotar este loop —
    // Room.width/height son legado pixel-based (ver getRoomGridSize) y
    // usarlos aquí es lo que permitía disparar cientos de miles de llamadas.
    const grid = await this.getRoomGridSize(roomId);

    // null = no se pudo leer la capa de piso del layout (formato viejo/raro):
    // se cae al comportamiento anterior (pintar todo el rectángulo) en vez
    // de bloquear la acción.
    const floorMask = await this.getGroundFloorMask(roomId);

    const stepsX = Math.ceil(grid.width / safeWidth);
    const stepsY = Math.ceil(grid.height / safeHeight);
    const total = Math.max(1, stepsX * stepsY);

    const results: Array<{ surface: unknown; removedIds: string[] }> = [];
    let done = 0;

    for (let y = 0; y < grid.height; y += safeHeight) {
      for (let x = 0; x < grid.width; x += safeWidth) {
        // Solo pintar donde el mapa realmente tiene piso (tile !== 0 en la
        // capa de suelo, ver getGroundFloorMask) — antes se pintaba todo el
        // rectángulo width x height de la sala, incluyendo el "aire" fuera
        // de la forma real del cuarto (rombo/L/etc.).
        const blockHasFloor =
          !floorMask ||
          this.blockOverlapsFloor(floorMask, x, y, safeWidth, safeHeight);

        if (blockHasFloor) {
          results.push(
            await this.paintSurface(
              userId,
              roomId,
              itemId,
              x,
              y,
              safeWidth,
              safeHeight,
              undefined,
              grid,
            ),
          );
        }

        done += 1;
        onProgress?.(done, total);
      }
    }

    // Cada elemento mantiene la misma forma {surface, removedIds} que ya usa
    // el evento singular `room:surface:painted`, para que el cliente pueda
    // reusar exactamente el mismo handler de render por cada tile.
    return {
      success: true,
      surfaces: results,
    };
  }

  /**
   * Dimensiones reales del grid isométrico de una sala, para acotar pintado
   * de superficies. `Room.width/height` NO son el tamaño del grid — son
   * campos legado pixel-based (por defecto 800x600 al crear una sala, ver
   * RoomsService.create) sin relación con el mapa Tiled. El tamaño real
   * vive en `RoomLayout.width/height`, asociado vía `Room.layoutId`.
   */
  private async getRoomGridSize(
    roomId: string,
  ): Promise<{ width: number; height: number }> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { layoutId: true, width: true, height: true },
    });

    if (!room) {
      throw new NotFoundException('Sala no encontrada');
    }

    if (room.layoutId) {
      const layout = await this.prisma.roomLayout.findUnique({
        where: { id: room.layoutId },
        select: { width: true, height: true, layoutJson: true },
      });

      if (layout) {
        // Fuente de verdad real: el propio JSON de Tiled. `RoomLayout.width/
        // height` son columnas separadas que se escriben a mano al crear el
        // layout (default 10 si no se pasan) y pueden desincronizarse del
        // mapa real — el cliente (Phaser) siempre usa map.width/height leído
        // de este mismo JSON, así que validar contra otra cosa rechaza
        // posiciones que el jugador ve como perfectamente válidas.
        const json = layout.layoutJson as {
          width?: number;
          height?: number;
        } | null;
        const jsonWidth = Number(json?.width);
        const jsonHeight = Number(json?.height);

        if (
          Number.isFinite(jsonWidth) &&
          jsonWidth > 0 &&
          Number.isFinite(jsonHeight) &&
          jsonHeight > 0
        ) {
          return { width: jsonWidth, height: jsonHeight };
        }

        // El JSON no trae width/height (formato viejo/inesperado): usar las
        // columnas del layout como respaldo.
        if (layout.width > 0 && layout.height > 0) {
          return { width: layout.width, height: layout.height };
        }
      }
    }

    // Red de seguridad si la sala no tiene layout asociado: acotar el
    // legado Room.width/height a un máximo razonable en vez de confiar en
    // valores pixel-based como 800x600.
    const MAX_FALLBACK_GRID = 50;
    return {
      width: Math.min(room.width, MAX_FALLBACK_GRID),
      height: Math.min(room.height, MAX_FALLBACK_GRID),
    };
  }

  /**
   * Set de "x,y" con las celdas que tienen piso real en el mapa (tile !== 0
   * en la capa de suelo del JSON de Tiled). Misma convención que el cliente
   * (LobbyScene.detectGroundLayer): la primera capa es el suelo si tiene
   * algún tile; si está vacía, se usa la capa con más tiles no vacíos
   * (mapas viejos donde la 1ra capa no es piso). Devuelve null si el layout
   * no trae capas utilizables, para que el caller decida un fallback seguro.
   */
  private async getGroundFloorMask(
    roomId: string,
  ): Promise<Set<string> | null> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { layoutId: true },
    });

    if (!room?.layoutId) return null;

    const layout = await this.prisma.roomLayout.findUnique({
      where: { id: room.layoutId },
      select: { layoutJson: true },
    });

    const layers = (layout?.layoutJson as any)?.layers as
      | Array<{ data?: number[]; width?: number; type?: string }>
      | undefined;

    if (!Array.isArray(layers)) return null;

    const tileLayers = layers.filter(
      (layer) => layer?.type === 'tilelayer' && Array.isArray(layer.data),
    );

    if (tileLayers.length === 0) return null;

    const countNonEmpty = (layer: { data?: number[] }) =>
      (layer.data ?? []).reduce(
        (total, value) => total + (value !== 0 ? 1 : 0),
        0,
      );

    let groundLayer = tileLayers[0];
    if (countNonEmpty(groundLayer) === 0) {
      groundLayer = tileLayers.reduce((best, layer) =>
        countNonEmpty(layer) > countNonEmpty(best) ? layer : best,
      );
    }

    const width = groundLayer.width ?? 0;
    const data = groundLayer.data ?? [];

    if (!width || data.length === 0) return null;

    const mask = new Set<string>();
    data.forEach((value, index) => {
      if (value === 0) return;
      const x = index % width;
      const y = Math.floor(index / width);
      mask.add(`${x},${y}`);
    });

    return mask;
  }

  /** ¿Alguna celda del bloque width x height (anclado en x,y) tiene piso? */
  private blockOverlapsFloor(
    floorMask: Set<string>,
    x: number,
    y: number,
    width: number,
    height: number,
  ): boolean {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        if (floorMask.has(`${x + dx},${y + dy}`)) return true;
      }
    }
    return false;
  }

  // ====================== PUNTO DE APARICIÓN ======================

  private findDefaultSpawnItem() {
    return this.prisma.item.findFirst({
      where: { category: SPAWN_CATEGORY, tags: { has: SPAWN_DEFAULT_TAG } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Si la sala no tiene punto de aparición, pone el predeterminado en la
   * casilla de piso libre más cercana al centro. Se llama al entrar a una
   * sala, así las salas viejas también lo reciben.
   */
  async ensureSpawnPoint(roomId: string) {
    const [existing, spawnItem] = await Promise.all([
      this.prisma.roomItem.findFirst({
        where: { roomId, item: { category: SPAWN_CATEGORY } },
        include: { item: true },
      }),
      this.findDefaultSpawnItem(),
    ]);
    if (existing) {
      // El admin eligió otro diseño predeterminado: las salas que tenían el
      // anterior pasan al nuevo, en el mismo lugar. Los comprados se quedan.
      if (spawnItem && isDefaultSpawn(existing.item) && existing.itemId !== spawnItem.id) {
        await this.prisma.roomItem.update({
          where: { id: existing.id },
          data: { itemId: spawnItem.id },
        });
      }
      return null;
    }
    if (!spawnItem) return null;
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { ownerId: true },
    });
    if (!room) return null;

    const grid = await this.getRoomGridSize(roomId);
    const floor = await this.getGroundFloorMask(roomId);
    const items = await this.prisma.roomItem.findMany({
      where: { roomId },
      include: { item: { include: { worldData: true } } },
    });
    const taken = new Set<string>();
    for (const roomItem of items) {
      if (this.isSurfaceRoomItem(roomItem) || roomItem.wallSide) continue;
      const footprint = this.getFootprint(
        roomItem.item.worldData,
        roomItem.rotation,
        roomItem.state,
      );
      for (const tile of this.toWorldTiles(roomItem.x, roomItem.y, footprint)) {
        taken.add(`${tile.x},${tile.y}`);
      }
    }

    const cx = Math.floor(grid.width / 2);
    const cy = Math.floor(grid.height / 2);
    let best: { x: number; y: number } | null = null;
    let bestDistance = Infinity;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const key = `${x},${y}`;
        if (taken.has(key) || (floor && !floor.has(key))) continue;
        const distance = (x - cx) ** 2 + (y - cy) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }
    if (!best) return null;

    return this.prisma.roomItem.create({
      data: {
        roomId,
        userId: room.ownerId,
        itemId: spawnItem.id,
        x: best.x,
        y: best.y,
        rotation: 0,
        elevation: 0,
        zIndex: 0,
      },
    });
  }

  // ====================== SALA DE DISEÑO ======================

  private async isDesignRoom(roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { isDesign: true },
    });
    return !!room?.isDesign;
  }

  /**
   * Copia los objetos de una sala a otra. Los padres de una pila se crean
   * antes que sus hijos (orden por elevación) para poder reenlazar
   * parentRoomItemId con los ids nuevos.
   */
  private async copyRoomItems(
    tx: any,
    fromRoomId: string,
    toRoomId: string,
    userId: string,
  ) {
    const source = await tx.roomItem.findMany({
      where: { roomId: fromRoomId },
      orderBy: { elevation: 'asc' },
    });
    // Orden topológico: cada objeto después de su padre (si el padre no está
    // en la sala, se copia suelto).
    const present = new Set(source.map((roomItem: any) => roomItem.id));
    const ordered: any[] = [];
    const done = new Set<string>();
    let pending = [...source];
    while (pending.length) {
      const next = pending.filter(
        (roomItem: any) =>
          !roomItem.parentRoomItemId ||
          !present.has(roomItem.parentRoomItemId) ||
          done.has(roomItem.parentRoomItemId),
      );
      if (!next.length) {
        ordered.push(...pending);
        break;
      }
      for (const roomItem of next) done.add(roomItem.id);
      ordered.push(...next);
      pending = pending.filter((roomItem: any) => !done.has(roomItem.id));
    }
    const ids = new Map<string, string>();
    for (const roomItem of ordered) {
      const created = await tx.roomItem.create({
        data: {
          roomId: toRoomId,
          userId,
          itemId: roomItem.itemId,
          x: roomItem.x,
          y: roomItem.y,
          elevation: roomItem.elevation,
          rotation: roomItem.rotation,
          color: roomItem.color,
          zIndex: roomItem.zIndex,
          state: roomItem.state ?? undefined,
          wallSide: roomItem.wallSide,
          wallOffset: roomItem.wallOffset,
          parentRoomItemId: roomItem.parentRoomItemId
            ? ids.get(roomItem.parentRoomItemId)
            : undefined,
        },
      });
      ids.set(roomItem.id, created.id);
    }
    return source.length;
  }

  /**
   * Abre la sala de diseño de `sourceRoomId` (una sala del jugador). Si ya
   * estaba diseñando esa misma sala se sigue donde quedó; si era otra, o se
   * pide `reset`, se arranca de nuevo con una copia de la sala real.
   */
  async openDesign(userId: string, sourceRoomId: string, reset = false) {
    const source = await this.prisma.room.findUnique({
      where: { id: sourceRoomId },
    });
    if (!source || source.isDesign) {
      throw new NotFoundException('Sala no encontrada');
    }
    if (source.ownerId !== userId) {
      throw new ForbiddenException('Solo puedes diseñar tus propias salas');
    }

    const existing = await this.prisma.room.findFirst({
      where: { ownerId: userId, isDesign: true },
    });

    if (existing && existing.designSourceRoomId === sourceRoomId && !reset) {
      return { roomId: existing.id, sourceRoomId };
    }

    return this.prisma.$transaction(
      async (tx) => {
        const room = existing
          ? await tx.room.update({
              where: { id: existing.id },
              data: {
                width: source.width,
                height: source.height,
                layoutId: source.layoutId,
                backgroundId: source.backgroundId,
                designSourceRoomId: sourceRoomId,
              },
            })
          : await tx.room.create({
              data: {
                ownerId: userId,
                name: 'Diseño',
                description: '',
                isPublic: false,
                accessMode: 'PRIVATE_INVITE_ONLY',
                isDesign: true,
                maxUsers: 1,
                width: source.width,
                height: source.height,
                layoutId: source.layoutId,
                backgroundId: source.backgroundId,
                designSourceRoomId: sourceRoomId,
              },
            });
        await this.lockRoomForWrite(tx, room.id);
        await tx.roomItem.deleteMany({ where: { roomId: room.id } });
        await this.copyRoomItems(tx, sourceRoomId, room.id, userId);
        return { roomId: room.id, sourceRoomId };
      },
      { timeout: 60000 },
    );
  }

  /**
   * Cuánto falta para hacer real el diseño. Al aplicarlo, lo que hoy está en
   * la sala real vuelve al inventario, así que cuenta como "lo tengo".
   * Las texturas no se gastan al pintar: con tener una alcanza.
   */
  private async quoteDesign(tx: any, userId: string) {
    const design = await tx.room.findFirst({
      where: { ownerId: userId, isDesign: true },
    });
    if (!design?.designSourceRoomId) {
      throw new NotFoundException('No tienes un diseño abierto');
    }

    const [designItems, sourceItems, inventory] = await Promise.all([
      tx.roomItem.findMany({
        where: { roomId: design.id },
        include: { item: { include: { worldData: true } } },
      }),
      tx.roomItem.findMany({
        where: { roomId: design.designSourceRoomId },
        include: { item: { include: { worldData: true } } },
      }),
      tx.userItem.findMany({ where: { userId } }),
    ]);

    const needed = new Map<
      string,
      { count: number; item: any; texture: boolean }
    >();
    for (const roomItem of designItems) {
      if (isDefaultSpawn(roomItem.item)) continue;
      const texture = !!this.isSurfaceRoomItem(roomItem);
      const entry = needed.get(roomItem.itemId) ?? {
        count: 0,
        item: roomItem.item,
        texture,
      };
      entry.count += texture ? 0 : 1;
      needed.set(roomItem.itemId, entry);
    }

    const have = new Map<string, number>();
    for (const inv of inventory) have.set(inv.itemId, inv.amount);
    for (const roomItem of sourceItems) {
      if (this.isSurfaceRoomItem(roomItem) || isDefaultSpawn(roomItem.item)) continue;
      have.set(roomItem.itemId, (have.get(roomItem.itemId) ?? 0) + 1);
    }

    const lines: DesignQuoteLine[] = [];
    for (const [itemId, { count, item, texture }] of needed) {
      const owned = have.get(itemId) ?? 0;
      const need = texture ? 1 : count;
      const missing = Math.max(0, need - owned);
      const price = item.coinsPrice ?? 0;
      lines.push({
        itemId,
        needed: need,
        have: owned,
        missing,
        price,
        cost: missing * price,
        buyable: missing === 0 || isDesignable(item),
      });
    }
    lines.sort((a, b) => b.cost - a.cost);

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    return {
      design,
      sourceRoomId: design.designSourceRoomId as string,
      designItems,
      sourceItems,
      lines,
      total: lines.reduce((sum, line) => sum + line.cost, 0),
      coins: user?.coins ?? 0,
    };
  }

  async getDesignQuote(userId: string) {
    const quote = await this.quoteDesign(this.prisma, userId);
    return {
      roomId: quote.design.id,
      sourceRoomId: quote.sourceRoomId,
      lines: quote.lines,
      total: quote.total,
      coins: quote.coins,
    };
  }

  /**
   * "Hacerlo real": cobra lo que falta, devuelve al inventario lo que había
   * en la sala real y la deja igual al diseño, gastando del inventario cada
   * objeto colocado. Todo o nada en una sola transacción.
   */
  async applyDesign(userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const quote = await this.quoteDesign(tx, userId);
        const { sourceRoomId, design } = quote;

        await this.lockRoomForWrite(tx, sourceRoomId);
        await this.lockRoomForWrite(tx, design.id);

        if (quote.lines.some((line) => !line.buyable)) {
          throw new BadRequestException(
            'Tu diseño tiene objetos que no se venden en la tienda',
          );
        }

        if (quote.total > 0) {
          const debited = await tx.user.updateMany({
            where: { id: userId, coins: { gte: quote.total } },
            data: { coins: { decrement: quote.total } },
          });
          if (debited.count === 0) {
            throw new BadRequestException('No tienes monedas suficientes');
          }
          await tx.coinTransaction.create({
            data: {
              userId,
              amount: -quote.total,
              reason: `design:${sourceRoomId}`,
            },
          });
        }

        const isSurface = (roomItem: any) => !!this.isSurfaceRoomItem(roomItem);

        // Inventario final de cada objeto del diseño: lo que tenía + lo que
        // había en la sala real + lo comprado - lo que queda colocado.
        for (const line of quote.lines) {
          const inv = await tx.userItem.findUnique({
            where: { userId_itemId: { userId, itemId: line.itemId } },
          });
          const inRoom = quote.sourceItems.filter(
            (roomItem: any) =>
              roomItem.itemId === line.itemId && !isSurface(roomItem),
          ).length;
          const texture = quote.designItems.some(
            (roomItem: any) =>
              roomItem.itemId === line.itemId && isSurface(roomItem),
          );
          const placed = texture ? 0 : line.needed;
          const final = (inv?.amount ?? 0) + inRoom + line.missing - placed;
          if (final > 0) {
            await tx.userItem.upsert({
              where: { userId_itemId: { userId, itemId: line.itemId } },
              update: { amount: final },
              create: {
                userId,
                itemId: line.itemId,
                amount: final,
                source: 'shop',
              },
            });
          } else if (inv) {
            await tx.userItem.delete({
              where: { userId_itemId: { userId, itemId: line.itemId } },
            });
          }
        }

        // Lo de la sala real que no se usa en el diseño vuelve entero.
        const designIds = new Set(quote.lines.map((line) => line.itemId));
        const leftovers = new Map<string, number>();
        for (const roomItem of quote.sourceItems) {
          if (
            isSurface(roomItem) ||
            designIds.has(roomItem.itemId) ||
            isDefaultSpawn(roomItem.item)
          ) {
            continue;
          }
          leftovers.set(
            roomItem.itemId,
            (leftovers.get(roomItem.itemId) ?? 0) + 1,
          );
        }
        for (const [itemId, amount] of leftovers) {
          await tx.userItem.upsert({
            where: { userId_itemId: { userId, itemId } },
            update: { amount: { increment: amount } },
            create: { userId, itemId, amount },
          });
        }

        await tx.roomItem.deleteMany({ where: { roomId: sourceRoomId } });
        const placed = await this.copyRoomItems(
          tx,
          design.id,
          sourceRoomId,
          userId,
        );

        return {
          sourceRoomId,
          designRoomId: design.id,
          placed,
          spent: quote.total,
        };
      },
      { timeout: 60000 },
    );
  }

  async getSingleItem(roomItemId: string) {
    return this.prisma.roomItem.findUnique({
      where: {
        id: roomItemId,
      },
      include: {
        item: {
          include: {
            worldData: true,
          },
        },
      },
    });
  }
}
