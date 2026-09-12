import Phaser from "phaser";
import { LobbySceneType } from "../types/LobbySceneType";
import {
  getDirectionalFootprint,
  toWorldTiles,
  type IsoTile,
} from "./IsoFootprint";
import { loadTextureOnce } from "../utils/phaserAssetCache";
import { getSpriteOffset } from "../utils/tileAnchor";
import {
  getSpriteFrameHeight,
  getSpriteFrameIndex,
  getSpriteFrameWidth,
  isSpriteRotatable,
} from "../utils/spriteFrames";
import { BUILD_PREVIEW_DEPTH, WORLD_OVERLAY_DEPTH } from "../utils/depth";

export default class BuildSystem {
  private scene: LobbySceneType;

  private selectedItem: any = null;

  private preview?: Phaser.GameObjects.Sprite;

  private rotation = 0;

  private textureKey?: string;

  private frameWidth = 0;

  private frameHeight = 0;

  private footprintGraphics?: Phaser.GameObjects.Graphics;

  constructor(scene: LobbySceneType) {
    this.scene = scene;
  }

  // initialRotation: para el ghost de "mover un mueble ya colocado" (ver
  // LobbyScene "build:item:move"), que debe arrancar mostrando la rotación
  // actual del mueble en vez de siempre resetear a 0.
  start(item: any, initialRotation = 0) {
    this.stop();

    this.selectedItem = item;

    this.rotation = ((initialRotation % 4) + 4) % 4;

    const imageUrl = item.imageUrl;

    this.frameWidth = getSpriteFrameWidth(item.worldData);
    this.frameHeight = getSpriteFrameHeight(item.worldData);

    void loadTextureOnce(this.scene, imageUrl)
      .then((textureKey) => this.createPreview(textureKey))
      .catch((err) => {
        // Si la textura falla (ej: CORS, 404), antes esto quedaba como una
        // promesa rechazada sin manejar: no aparecía preview, no se podía
        // colocar nada, y no había ningún log claro de por qué.
        console.error(
          "❌ No se pudo cargar la textura del item a construir:",
          imageUrl,
          err,
        );
      });
  }

  private createPreview(textureKey: string) {
    this.textureKey = textureKey;

    const texture = this.scene.textures.get(textureKey);

    // Frame envuelto al número de caras (1/2/4), no la rotación cruda.
    const frameIndex = getSpriteFrameIndex(
      this.rotation,
      this.selectedItem?.worldData,
    );
    const frameName = `${textureKey}-build-frame-${frameIndex}`;

    if (!texture.has(frameName)) {
      texture.add(
        frameName,
        0,
        this.frameWidth * frameIndex,
        0,
        this.frameWidth,
        this.frameHeight,
      );
    }

    this.preview = this.scene.add
      .sprite(0, 0, textureKey, frameName)
      .setAlpha(0.6)
      .setDepth(BUILD_PREVIEW_DEPTH);

    this.preview.setOrigin(0.5, 1);

    const kind = this.selectedItem?.worldData?.kind;
    const grid = this.scene.isoGrid;

    if (kind === "FLOOR" && grid) {
      this.preview.setDisplaySize(grid.tileWidth, grid.tileHeight);
    }

    this.footprintGraphics = this.scene.add.graphics();
    this.footprintGraphics.setDepth(WORLD_OVERLAY_DEPTH);
    this.preview.setScrollFactor(1);
  }

  /** Tiles que ocuparía el item si se colocara en (tileX, tileY) ahora mismo. */
  getFootprintTilesAt(tileX: number, tileY: number): IsoTile[] {
    if (!this.selectedItem) return [];
    const footprint = getDirectionalFootprint(
      this.selectedItem.worldData,
      this.rotation,
    );
    return toWorldTiles(tileX, tileY, footprint);
  }

  update(pointer: Phaser.Input.Pointer) {
    const grid = this.scene.isoGrid;
    if (!this.preview || !grid) return;

    const tile = grid.pointerToTile(this.scene.cameras.main, pointer);
    if (!tile) return;

    const roomItems = (this.scene as any).roomItems;
    const highest = roomItems?.getHighestItemAt(tile.x, tile.y);

    let elevation = 0;

    if (highest) {
      const stackHeight = highest.item?.worldData?.stackHeight ?? 1;
      elevation = highest.elevation + stackHeight;
    }

    // Mismo ancla que usará el mueble real al colocarse: el del footprint
    // completo, no el del tile bajo el cursor. Sin esto el ghost y el
    // objeto final quedan en sitios distintos para muebles de varios tiles.
    const anchor =
      grid.footprintAnchor(this.getFootprintTilesAt(tile.x, tile.y)) ??
      grid.groundAnchor(tile.x, tile.y);

    if (!anchor) return;

    // Misma calibración visual que aplica RoomItemsManager al objeto ya
    // colocado (WorldItemData.spriteOffsetX/Y).
    const offset = getSpriteOffset(this.selectedItem?.worldData, this.rotation);

    this.preview.setPosition(
      anchor.x + offset.x,
      anchor.y - elevation * grid.elevationStep + offset.y,
    );
  }

  rotate() {
    if (!this.preview) return;

    // Un item de una sola cara no tiene con qué rotar (su frameWidth es el
    // ancho completo de la imagen). Con 2 o 4 caras sí rota; el footprint
    // gira por las 4 direcciones y el FRAME se envuelve al número de caras.
    const worldData = this.selectedItem?.worldData;
    if (!isSpriteRotatable(worldData)) return;

    this.rotation = (this.rotation + 1) % 4;

    const texture = this.scene.textures.get(this.textureKey!);

    const frameIndex = getSpriteFrameIndex(this.rotation, worldData);
    const frameName = `${this.textureKey}-build-frame-${frameIndex}`;

    if (!texture.has(frameName)) {
      texture.add(
        frameName,
        0,
        this.frameWidth * frameIndex,
        0,
        this.frameWidth,
        this.frameHeight,
      );
    }

    this.preview.setFrame(frameName);
  }

  stop() {
    this.selectedItem = null;

    this.rotation = 0;

    this.preview?.destroy();

    this.footprintGraphics?.destroy();

    this.preview = undefined;
    this.footprintGraphics = undefined;
  }

  getCurrentItem() {
    return this.selectedItem;
  }

  getRotation() {
    return this.rotation;
  }

  getPreview() {
    return this.preview;
  }

  /**
   * Rombo de validez sobre cada tile que ocuparía el mueble.
   *
   * Los 4 vértices vienen de `IsoGrid.groundDiamond()`, la misma fuente que
   * usa el resaltado del cursor y el ancla del mueble. Antes se calculaban
   * aquí a mano con `getFootprintTopY()`, una tercera fórmula que había que
   * recalibrar por separado cada vez que se tocaba cualquiera de las otras.
   */
  drawFootprint(
    tiles: IsoTile[],
    valid: boolean,
    support: "ground" | "stack" = "ground",
  ) {
    const grid = this.scene.isoGrid;
    if (!this.footprintGraphics || !grid) return;

    this.footprintGraphics.clear();

    const color = support === "stack" ? 0x3399ff : valid ? 0x00ff00 : 0xff0000;

    this.footprintGraphics.lineStyle(2, color, 1);
    this.footprintGraphics.fillStyle(color, 0.25);

    for (const tile of tiles) {
      const diamond = grid.groundDiamond(tile.x, tile.y);
      if (!diamond) continue;

      this.footprintGraphics.fillPoints(
        diamond.map((p) => new Phaser.Geom.Point(p.x, p.y)),
        true,
      );
    }
  }
}
