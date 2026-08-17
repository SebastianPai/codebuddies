import Phaser from "phaser";
import { WorldObject } from "../types/WorldObject";
import {
  getDirectionalFootprint,
  getDirectionalSurface,
  toWorldTiles,
} from "./IsoFootprint";
import { getFurnitureAnchorY } from "../utils/tileAnchor";
import { pointerToScreenPosition } from "../utils/pointerToScreenPosition";

export default class RoomItemsManager {
  private scene: Phaser.Scene;

  private items = new Map<string, WorldObject>();

  // Sprite del mueble actualmente seleccionado (clic simple, sin abrir
  // modal) — solo uno a la vez, se destiñe automáticamente al seleccionar
  // otro o al deseleccionar (Escape / clic en otro lado / cerrar el menú).
  private selectedId: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  addItem(
    id: string,
    texture: string,
    x: number,
    y: number,

    tileX: number,
    tileY: number,

    rotation: number = 0,

    frameWidth?: number,
    frameHeight?: number,

    roomId: string = "",
    ownerId: string = "",
    itemData: any = null,

    elevation: number = 0,
    parentRoomItemId: string | null = null,
    wallSide: string | null = null,
    wallOffset: number | null = null,
  ) {
    if (!this.scene.textures.exists(texture)) {
      console.error("❌ TEXTURA NO CARGADA", texture);

      return null;
    }

    const tex = this.scene.textures.get(texture);
    const worldData = itemData?.worldData;
    const state = itemData?.roomItemState ?? itemData?.state ?? {};
    const isSurface =
      state?.surface ||
      worldData?.kind === "FLOOR" ||
      worldData?.kind === "WALL";

    let frameName = "__BASE";

    // spritesheet horizontal de 4 caras
    if (
      !isSurface &&
      frameWidth &&
      frameHeight &&
      rotation >= 0 &&
      rotation <= 3
    ) {
      frameName = `${texture}-room-${rotation}`;

      if (!tex.has(frameName)) {
        tex.add(
          frameName,
          0,
          frameWidth * rotation,
          0,
          frameWidth,
          frameHeight,
        );
      }
    }

    const surfaceSprites = isSurface
      ? this.createSurfaceSprites(texture, tileX, tileY, itemData, wallSide)
      : [];

    const sprite =
      surfaceSprites[0] ??
      this.scene.add.sprite(x, y - elevation * 16, texture, frameName);

    if (!isSurface) {
      sprite.setInteractive({
        useHandCursor: true,
      });
    }

    sprite.setOrigin(0.5, 1);

    const footprint = getDirectionalFootprint(worldData, rotation);
    const depthTile = toWorldTiles(tileX, tileY, footprint).sort(
      (a, b) => b.y - a.y || b.x - a.x,
    )[0] || { x: tileX, y: tileY };
    const depth = depthTile.y * 1000 + depthTile.x + elevation * 100;

    if (!isSurface) {
      sprite.setDepth(depth);
    }

    const worldObject: WorldObject = {
      roomItemId: id,

      roomId,

      ownerId,

      rotation,

      tileX,
      tileY,

      elevation,
      parentRoomItemId,
      wallSide,
      wallOffset,
      state,

      sprite,
      surfaceSprites,

      item: itemData,
    };
    this.items.set(id, worldObject);
    this.invalidateOccupancy();

    if (!isSurface) {
      sprite.on(
        "pointerdown",
        (
          pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          // Si hay un mueble en mano (modo construcción), dejamos que el
          // pointerdown suba hasta FurniturePlacementSystem para que lo
          // coloque encima de este item en vez de seleccionarlo.
          if ((this.scene as any).buildSystem?.getCurrentItem?.()) {
            return;
          }

          // Sin esto, el pointerdown global de la escena (this.input.on
          // "pointerdown" -> handleClickToMove) también se dispara y el
          // personaje sale a caminar hacia el mueble clickeado a la vez que
          // se selecciona — mismo fix que makeOtherPlayerClickable en
          // LobbyScene para el clic sobre otros jugadores.
          event.stopPropagation();

          this.selectItem(id);

          window.dispatchEvent(
            new CustomEvent("room:item:selected", {
              detail: {
                furniture: worldObject,
                ...pointerToScreenPosition(this.scene, pointer),
              },
            }),
          );
        },
      );
    }

    return sprite;
  }

  // Solo resalta el sprite (tint); no abre ningún modal por sí solo — quién
  // reacciona a "room:item:selected" decide qué UI mostrar.
  selectItem(id: string) {
    if (this.selectedId === id) return;

    this.clearSelection();

    const worldObject = this.items.get(id);
    if (!worldObject) return;

    worldObject.sprite.setTint(0x8ecbff);
    this.selectedId = id;
  }

  // Devuelve true si realmente había algo seleccionado (para que quien
  // llama solo notifique a React si hubo un cambio real).
  clearSelection(): boolean {
    if (!this.selectedId) return false;

    const worldObject = this.items.get(this.selectedId);
    worldObject?.sprite.clearTint();
    this.selectedId = null;

    return true;
  }

  private createSurfaceSprites(
    texture: string,
    tileX: number,
    tileY: number,
    itemData: any,
    wallSide: string | null,
  ) {
    const sprites: Phaser.GameObjects.Sprite[] = [];
    const sceneWithMap = this.scene as any;
    const groundLayer = sceneWithMap.groundLayer as
      | Phaser.Tilemaps.TilemapLayer
      | undefined;
    const map = sceneWithMap.map as Phaser.Tilemaps.Tilemap | undefined;

    if (!groundLayer || !map) return sprites;

    const state = itemData?.roomItemState ?? itemData?.state ?? {};
    const width = Math.max(
      1,
      Number(state.width ?? itemData?.worldData?.width ?? 1),
    );
    const height = Math.max(
      1,
      Number(state.height ?? itemData?.worldData?.height ?? 1),
    );
    const kind = itemData?.worldData?.kind;

    for (let iy = 0; iy < height; iy++) {
      for (let ix = 0; ix < width; ix++) {
        const worldPos = groundLayer.tileToWorldXY(tileX + ix, tileY + iy);
        if (!worldPos) continue;

        const sprite = this.scene.add.sprite(
          worldPos.x + map.tileWidth / 2,
          getFurnitureAnchorY(worldPos.y, map.tileHeight),
          texture,
        );

        sprite.setOrigin(0.5, 1);

        if (kind === "FLOOR") {
          sprite.setDisplaySize(map.tileWidth, map.tileHeight);
        }

        sprite.setAlpha(0.96);

        if (kind === "WALL" || wallSide) {
          sprite.setY(sprite.y - map.tileHeight / 2);
          sprite.setDepth(1000000);
        } else {
          sprite.setDepth(1);
        }

        sprites.push(sprite);
      }
    }

    return sprites;
  }

  removeItem(id: string) {
    const worldObject = this.items.get(id);

    if (!worldObject) {
      return;
    }

    worldObject.surfaceSprites?.forEach((sprite) => sprite.destroy());

    if (!worldObject.surfaceSprites?.includes(worldObject.sprite)) {
      worldObject.sprite.destroy();
    }

    this.items.delete(id);
    this.invalidateOccupancy();

    if (this.selectedId === id) this.selectedId = null;
  }

  getItem(id: string) {
    return this.items.get(id);
  }

  getAll() {
    return [...this.items.values()];
  }

  getItemsAt(tileX: number, tileY: number) {
    return this.getAll().filter(
      (item) =>
        toWorldTiles(
          item.tileX,
          item.tileY,
          getDirectionalFootprint(item.item?.worldData, item.rotation),
        ).some((tile) => tile.x === tileX && tile.y === tileY),
    );
  }

  // Antes getBlockingTiles()/getOccupiedTiles() recorrían TODOS los items en
  // cada llamada — y se llaman en rutas calientes: cada pixel que cruza el
  // mouse sobre un tile nuevo (updateHoverHighlight → isWalkable) y cada
  // frame en build mode (updateBuildPreviewTint → canPlace). El resultado
  // solo cambia cuando algo se coloca/mueve/rota/elimina, así que se cachea
  // y se recalcula una sola vez (un único recorrido O(items) para ambos
  // sets) recién cuando algo lo invalida.
  private occupancyCache: { blocking: Set<string>; occupied: Set<string> } | null = null;

  invalidateOccupancy() {
    this.occupancyCache = null;
  }

  private computeOccupancyEntries(excludeId?: string) {
    const blocking = new Set<string>();
    const occupied = new Set<string>();

    this.items.forEach((worldObject, id) => {
      if (id === excludeId) return;

      const worldData = worldObject.item?.worldData;
      const isWallObject =
        worldObject.wallSide ||
        worldData?.placementType === "WALL" ||
        worldData?.kind === "FLOOR" ||
        worldData?.kind === "WALL";

      if (isWallObject) return;

      const footprint = getDirectionalFootprint(
        worldData,
        worldObject.rotation,
      );
      const blocksMovement =
        worldData?.isCollidable === true && !worldData?.walkable;

      for (const tile of toWorldTiles(
        worldObject.tileX,
        worldObject.tileY,
        footprint,
      )) {
        const key = `${tile.x},${tile.y}`;
        occupied.add(key);
        if (blocksMovement) blocking.add(key);
      }
    });

    return { blocking, occupied };
  }

  private computeOccupancy() {
    this.occupancyCache = this.computeOccupancyEntries();
    return this.occupancyCache;
  }

  // Variante sin caché para el ghost de "mover un mueble ya colocado": el
  // mueble que se está moviendo no puede contarse como ocupando SUS PROPIAS
  // tiles, si no canPlace() siempre lo vería bloqueado por sí mismo. No se
  // cachea porque solo se usa mientras dura un drag activo (infrecuente),
  // a diferencia de getBlockingTiles()/getOccupiedTiles() que sí están en
  // rutas calientes de 60fps.
  getOccupancyExcluding(excludeId: string): { blocking: Set<string>; occupied: Set<string> } {
    return this.computeOccupancyEntries(excludeId);
  }

  // Tiles intransitables para el pathfinding (solo items colisionables).
  getBlockingTiles(): Set<string> {
    return (this.occupancyCache ?? this.computeOccupancy()).blocking;
  }

  // Tiles ocupados por CUALQUIER item colocado, sea o no colisionable — a
  // diferencia de getBlockingTiles(). PlacementValidator.canPlace() necesita
  // esto: antes solo miraba getBlockingTiles(), así que un item no
  // colisionable (una alfombra, un cuadro) nunca marcaba su tile como
  // ocupado y se podía apilar un número ilimitado de copias en el mismo
  // lugar.
  getOccupiedTiles(): Set<string> {
    return (this.occupancyCache ?? this.computeOccupancy()).occupied;
  }

  getStackTarget(tileX: number, tileY: number) {
    return this.getAll()
      .filter((item) => {
        if (!item.item?.worldData?.allowsStacking) return false;
        const surface = getDirectionalSurface(item.item.worldData, item.rotation);
        const tiles = surface.occupied.length
          ? toWorldTiles(item.tileX, item.tileY, surface)
          : toWorldTiles(
              item.tileX,
              item.tileY,
              getDirectionalFootprint(item.item.worldData, item.rotation),
            );
        return tiles.some((tile) => tile.x === tileX && tile.y === tileY);
      })
      .sort((a, b) => b.elevation - a.elevation)[0];
  }

  getHighestItemAt(tileX: number, tileY: number) {
    return this.getItemsAt(tileX, tileY).sort(
      (a, b) => b.elevation - a.elevation,
    )[0];
  }

  // Antes se llamaba a esto (recorriendo TODOS los items) sin condición en
  // cada frame desde LobbyScene.update() — la profundidad de un mueble solo
  // cambia cuando se coloca/mueve/rota, eventos que ya se manejan puntuales
  // en FurnitureSocketSystem. updateItemDepth() permite recalcular solo el
  // item que realmente cambió, en vez de recorrer la sala entera 60 veces
  // por segundo sin que nada haya cambiado.
  private updateSingleItemDepth(worldObject: WorldObject) {
    const worldData = worldObject.item?.worldData;
    const isSurface =
      worldObject.state?.surface ||
      worldData?.kind === "FLOOR" ||
      worldData?.kind === "WALL";

    if (isSurface || worldObject.wallSide) return;

    const footprint = getDirectionalFootprint(
      worldData,
      worldObject.rotation,
    );
    const depthTile =
      toWorldTiles(worldObject.tileX, worldObject.tileY, footprint).sort(
        (a, b) => b.y - a.y || b.x - a.x,
      )[0] || { x: worldObject.tileX, y: worldObject.tileY };

    worldObject.sprite.setDepth(
      depthTile.y * 1000 + depthTile.x + worldObject.elevation * 100,
    );
  }

  updateItemDepth(id: string) {
    const worldObject = this.items.get(id);
    if (worldObject) this.updateSingleItemDepth(worldObject);
  }

  updateDepths() {
    this.items.forEach((worldObject) => this.updateSingleItemDepth(worldObject));
  }

  clear() {
    this.items.forEach((item) => {
      item.sprite.destroy();
    });

    this.items.clear();
    this.invalidateOccupancy();
    this.selectedId = null;
  }
}
