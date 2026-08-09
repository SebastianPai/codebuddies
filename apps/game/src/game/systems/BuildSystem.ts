import Phaser from "phaser";
import { LobbySceneType } from "../types/LobbySceneType";
import { IsoTile } from "./IsoFootprint";
import { loadTextureOnce } from "../utils/phaserAssetCache";
import { getFurnitureAnchorY, getFootprintTopY } from "../utils/tileAnchor";
import { WORLD_OVERLAY_DEPTH } from "../utils/depth";

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

    console.log("🏠 BuildSystem iniciado", item);

    const imageUrl = item.imageUrl;

    this.frameWidth = item.worldData.engineData?.frameWidth ?? item.worldData.width / 4;
    this.frameHeight = item.worldData.engineData?.frameHeight ?? item.worldData.height;

    void loadTextureOnce(this.scene, imageUrl).then((textureKey) => this.createPreview(textureKey));
  }

  private createPreview(textureKey: string) {
    this.textureKey = textureKey;

    const texture = this.scene.textures.get(textureKey);

    const frameName = `${textureKey}-build-frame-${this.rotation}`;

    if (!texture.has(frameName)) {
      texture.add(
        frameName,
        0,
        this.frameWidth * this.rotation,
        0,
        this.frameWidth,
        this.frameHeight,
      );
    }

    this.preview = this.scene.add
      .sprite(0, 0, textureKey, frameName)
      .setAlpha(0.6)
      .setDepth(999999);

    this.preview.setOrigin(0.5, 1);

    const kind = this.selectedItem?.worldData?.kind;

    if (kind === "FLOOR") {
      this.preview.setDisplaySize(
        this.scene.map.tileWidth,
        this.scene.map.tileHeight,
      );
    }

    this.footprintGraphics = this.scene.add.graphics();
    // Antes 9: por debajo de la profundidad real de cualquier mueble/avatar
    // desde la fila 1 en adelante, así que el rombo de preview de
    // construcción quedaba oculto casi en todo el mapa.
    this.footprintGraphics.setDepth(WORLD_OVERLAY_DEPTH);
    this.preview.setScrollFactor(1);
  }

  update(pointer: Phaser.Input.Pointer) {
    if (!this.preview || !this.scene.groundLayer) return;

    const worldPoint = this.scene.cameras.main.getWorldPoint(
      pointer.x,
      pointer.y,
    );

    const tileXY = this.scene.groundLayer.worldToTileXY(
      worldPoint.x,
      worldPoint.y,
      false,
    );

    if (!tileXY) return;

    const worldPos = this.scene.groundLayer.tileToWorldXY(
      Math.floor(tileXY.x),
      Math.floor(tileXY.y),
    );

    if (!worldPos) return;

    const roomItems = (this.scene as any).roomItems;

    const highest = roomItems?.getHighestItemAt(
      Math.floor(tileXY.x),
      Math.floor(tileXY.y),
    );

    let elevation = 0;

    if (highest) {
      const stackHeight = highest.item?.worldData?.stackHeight ?? 1;

      elevation = highest.elevation + stackHeight;
    }

    this.preview.setPosition(
      worldPos.x + this.scene.map.tileWidth / 2,
      getFurnitureAnchorY(worldPos.y, this.scene.map.tileHeight) -
        elevation * 16,
    );
  }

  rotate() {
    if (!this.preview) return;

    this.rotation++;

    if (this.rotation > 3) {
      this.rotation = 0;
    }

    const texture = this.scene.textures.get(this.textureKey!);

    const frameName = `${this.textureKey}-build-frame-${this.rotation}`;

    if (!texture.has(frameName)) {
      texture.add(
        frameName,
        0,
        this.frameWidth * this.rotation, // X
        0, // Y
        this.frameWidth,
        this.frameHeight,
      );
    }

    this.preview.setFrame(frameName);

    console.log("🔄 Frame:", this.rotation);
  }

  stop() {
    this.selectedItem = null;

    this.rotation = 0;

    this.preview?.destroy();

    this.footprintGraphics?.destroy();

    this.preview = undefined;
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

  getCurrentTile() {
    if (!this.preview || !this.scene.groundLayer) {
      return null;
    }

    const tileXY = this.scene.groundLayer.worldToTileXY(
      this.preview.x,
      this.preview.y,
      false,
    );

    if (!tileXY) {
      return null;
    }

    return {
      x: Math.floor(tileXY.x),
      y: Math.floor(tileXY.y),
    };
  }

  drawFootprint(
    tileX: number,
    tileY: number,
    width: number,
    height: number,
    valid: boolean,
    tiles?: IsoTile[],
    support: "ground" | "stack" = "ground",
  ) {
    if (!this.footprintGraphics) {
      return;
    }

    this.footprintGraphics.clear();

    const color = support === "stack" ? 0x3399ff : valid ? 0x00ff00 : 0xff0000;

    const footprintTiles =
      tiles ??
      Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => ({ x, y })),
      ).flat();

    for (const tile of footprintTiles) {
        const worldPos = this.scene.groundLayer.tileToWorldXY(
          tileX + tile.x,
          tileY + tile.y,
        );

        if (!worldPos) continue;

        this.footprintGraphics.lineStyle(2, color, 1);
        this.footprintGraphics.fillStyle(color, 0.25);

        const tileHeight = this.scene.map.tileHeight;
        const topY = getFootprintTopY(worldPos.y, tileHeight);

        this.footprintGraphics.fillPoints(
          [
            new Phaser.Geom.Point(
              worldPos.x + this.scene.map.tileWidth / 2,
              topY,
            ),
            new Phaser.Geom.Point(
              worldPos.x + this.scene.map.tileWidth,
              topY + tileHeight / 2,
            ),
            new Phaser.Geom.Point(
              worldPos.x + this.scene.map.tileWidth / 2,
              topY + tileHeight,
            ),
            new Phaser.Geom.Point(worldPos.x, topY + tileHeight / 2),
          ],
          true,
        );
    }
  }
}
