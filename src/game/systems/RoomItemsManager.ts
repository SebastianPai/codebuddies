import Phaser from "phaser";
import { WorldObject } from "../types/WorldObject";
import {
  getDirectionalFootprint,
  getDirectionalSurface,
  toWorldTiles,
} from "./IsoFootprint";
import { getFurnitureAnchorY } from "../utils/tileAnchor";

export default class RoomItemsManager {
  private scene: Phaser.Scene;

  private items = new Map<string, WorldObject>();

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
    console.log("📦 ADD ITEM", {
      id,
      texture,
      x,
      y,
      rotation,
      frameWidth,
      frameHeight,
    });

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

    console.log("✅ ITEM CREADO", {
      rotation,
      frameName,
      x: sprite.x,
      y: sprite.y,
      tileX,
      tileY,
      depthTile,
      depth,
    });

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

    if (!isSurface) {
      sprite.on("pointerdown", () => {
        window.dispatchEvent(
          new CustomEvent("room:item:selected", {
            detail: worldObject,
          }),
        );
      });
    }

    return sprite;
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

  getBlockingTiles() {
    const tiles = new Set<string>();

    this.items.forEach((worldObject) => {
      const worldData = worldObject.item?.worldData;
      const isWallObject =
        worldObject.wallSide ||
        worldData?.placementType === "WALL" ||
        worldData?.kind === "FLOOR" ||
        worldData?.kind === "WALL";

      const blocksMovement = worldData?.isCollidable === true;
      const willBlock =
        !isWallObject && blocksMovement && !worldData?.walkable;

      // 🐛 DEBUG TEMPORAL — borrar después de diagnosticar por qué un item
      // colisionable no bloquea el paso.
      console.log("🧱 BLOCKING CHECK", {
        roomItemId: worldObject.roomItemId,
        kind: worldData?.kind,
        placementType: worldData?.placementType,
        wallSide: worldObject.wallSide,
        isCollidable: worldData?.isCollidable,
        walkable: worldData?.walkable,
        isWallObject,
        willBlock,
        tileX: worldObject.tileX,
        tileY: worldObject.tileY,
      });

      if (isWallObject) return;

      if (blocksMovement && !worldData?.walkable) {
        const footprint = getDirectionalFootprint(
          worldData,
          worldObject.rotation,
        );

        for (const tile of toWorldTiles(
          worldObject.tileX,
          worldObject.tileY,
          footprint,
        )) {
          tiles.add(`${tile.x},${tile.y}`);
        }
      }
    });

    // 🐛 DEBUG TEMPORAL
    console.log("🧱 BLOCKING TILES SET", [...tiles]);

    return tiles;
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

  updateDepths() {
    this.items.forEach((worldObject) => {
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
    });
  }

  clear() {
    this.items.forEach((item) => {
      item.sprite.destroy();
    });

    this.items.clear();
  }
}
