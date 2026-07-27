import Phaser from "phaser";
import { canonicalAssetKey, loadTextureOnce } from "../utils/phaserAssetCache";

type BackgroundScaleMode = "cover" | "contain" | "height";

type RoomBackground = {
  id?: string;
  name?: string;
  imageUrl?: string;
  previewUrl?: string;
  metadata?: {
    anchor?: {
      x?: number;
      y?: number;
      scaleMode?: BackgroundScaleMode;
    };
  } | null;
};

type BackgroundComposition = {
  layoutAnchor?: {
    x?: number;
    y?: number;
  };
};

export default class BackgroundManager {
  private image?: Phaser.GameObjects.Image;
  private currentKey?: string;
  private resizeHandler?: () => void;

  constructor(private readonly scene: Phaser.Scene) {}

  setBackground(
    background?: RoomBackground | null,
    composition: BackgroundComposition = {},
  ) {
    if (!background?.imageUrl) {
      this.clear();
      return;
    }

    const key = canonicalAssetKey(background.imageUrl);
    const render = () => this.render(key, background, composition);

    if (this.scene.textures.exists(key)) {
      render();
      return;
    }

    void loadTextureOnce(this.scene, background.imageUrl, { key, pixelArt: false }).then(render);
  }

  clear() {
    this.image?.destroy();
    this.image = undefined;
    this.currentKey = undefined;
    if (this.resizeHandler) {
      this.scene.scale.off("resize", this.resizeHandler);
      this.resizeHandler = undefined;
    }
  }

  destroy() {
    this.clear();
  }

  private render(
    key: string,
    background: RoomBackground,
    composition: BackgroundComposition,
  ) {
    if (this.currentKey === key && this.image) return;

    this.image?.destroy();
    this.currentKey = key;

    const applyLayout = () => {
      if (!this.image) return;

      const screenW = this.scene.scale.width;
      const screenH = this.scene.scale.height;
      const imgW = this.image.width;
      const imgH = this.image.height;
      const anchor = background.metadata?.anchor;
      const anchorX = Phaser.Math.Clamp(Number(anchor?.x ?? 50), 0, 100) / 100;
      const anchorY = Phaser.Math.Clamp(Number(anchor?.y ?? 50), 0, 100) / 100;
      const scaleMode = anchor?.scaleMode ?? "cover";
      const scale = this.getScale(scaleMode, screenW, screenH, imgW, imgH);
      const layoutAnchorX = Number(composition.layoutAnchor?.x ?? screenW / 2);
      const layoutAnchorY = Number(composition.layoutAnchor?.y ?? screenH / 2);

      this.image
        .setOrigin(anchorX, anchorY)
        .setScale(scale)
        .setPosition(layoutAnchorX, layoutAnchorY);
    };

    this.image = this.scene.add
      .image(0, 0, key)
      .setScrollFactor(1)
      .setDepth(-1000);

    applyLayout();
    this.resizeHandler = applyLayout;
    this.scene.scale.on("resize", this.resizeHandler);
  }

  private getScale(
    mode: BackgroundScaleMode,
    screenW: number,
    screenH: number,
    imgW: number,
    imgH: number,
  ) {
    if (mode === "contain") return Math.min(screenW / imgW, screenH / imgH);
    if (mode === "height") return screenH / imgH;
    return Math.max(screenW / imgW, screenH / imgH);
  }
}
