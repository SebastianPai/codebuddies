import Phaser from "phaser";
import { AMBIENT_LIGHT_DEPTH } from "../utils/depth";

// Antes la pestaña "Iluminación" de Editar Mundo guardaba el valor en el
// servidor y lo mostraba en un slider, pero nada en el cliente lo
// RENDERIZABA — ni al entrar a la sala (room:joined no mandaba el valor) ni
// en vivo (nadie escuchaba room:lighting:changed). Este es el único lugar
// que efectivamente oscurece la sala.
//
// Tope de opacidad: a intensidad 100 la sala debe seguir siendo jugable
// (verse muebles/otros jugadores), no un rectángulo negro opaco.
const MAX_ALPHA = 0.82;
const FADE_IN_MS = 400;
const FADE_OUT_MS = 300;

export default class AmbientLightOverlay {
  private rect?: Phaser.GameObjects.Rectangle;
  private resizeHandler?: () => void;

  constructor(private readonly scene: Phaser.Scene) {}

  setIntensity(intensity: number | null | undefined) {
    const clamped = Phaser.Math.Clamp(Number(intensity) || 0, 0, 100);

    if (clamped <= 0) {
      this.fadeOutAndClear();
      return;
    }

    if (!this.rect) {
      this.rect = this.scene.add
        .rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000)
        .setOrigin(0, 0)
        // Fijo a la cámara (no al mundo): siempre cubre todo el viewport
        // visible sin importar hacia dónde mire la cámara.
        .setScrollFactor(0)
        .setDepth(AMBIENT_LIGHT_DEPTH)
        .setAlpha(0);

      this.resizeHandler = () => {
        this.rect?.setSize(this.scene.scale.width, this.scene.scale.height);
      };
      this.scene.scale.on("resize", this.resizeHandler);
    }

    this.scene.tweens.add({
      targets: this.rect,
      alpha: (clamped / 100) * MAX_ALPHA,
      duration: FADE_IN_MS,
      ease: "Sine.easeInOut",
    });
  }

  private fadeOutAndClear() {
    if (!this.rect) return;

    const rect = this.rect;
    this.rect = undefined;

    this.scene.tweens.add({
      targets: rect,
      alpha: 0,
      duration: FADE_OUT_MS,
      ease: "Sine.easeIn",
      onComplete: () => rect.destroy(),
    });
  }

  destroy() {
    if (this.resizeHandler) {
      this.scene.scale.off("resize", this.resizeHandler);
      this.resizeHandler = undefined;
    }
    this.rect?.destroy();
    this.rect = undefined;
  }
}
