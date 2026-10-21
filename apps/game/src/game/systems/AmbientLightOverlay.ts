import Phaser from "phaser";
import { AMBIENT_LIGHT_DEPTH } from "../utils/depth";

// Oscuridad de la sala (pestaña "Iluminación" de Editar Mundo) CON luces.
//
// Antes era un rectángulo negro encima de todo: las lámparas encendidas
// brillaban DEBAJO de él, así que con la sala a oscuras no iluminaban nada.
// Ahora la oscuridad es una RenderTexture que se rellena de negro y a la que
// se le "borra" un degradado suave en cada fuente de luz: la luz de verdad
// atraviesa la oscuridad y deja ver el color del brillo que hay debajo.
//
// LIVIANO: la textura tiene el tamaño de lo que ve la cámara en unidades del
// mundo (no del canvas), solo se redibuja mientras la sala está oscura, y el
// degradado es UNA textura de 256px generada una vez y reutilizada.
//
// Tope de opacidad: a intensidad 100 la sala debe seguir siendo jugable
// (verse muebles/otros jugadores), no un rectángulo negro opaco.
const MAX_ALPHA = 0.82;
const FADE_IN_MS = 400;
const FADE_OUT_MS = 300;

const GRADIENT_KEY = "cb-light-gradient";
const GRADIENT_SIZE = 256;
// El agujero es algo más grande que el radio nominal: el borde del degradado
// es casi transparente, así se nota un círculo de luz del tamaño pedido.
const HOLE_SCALE = 1.25;

/** Una fuente de luz en coordenadas del MUNDO. */
export type LightSource = { x: number; y: number; radius: number };

export default class AmbientLightOverlay {
  private rt?: Phaser.GameObjects.RenderTexture;
  private stamp?: Phaser.GameObjects.Image;
  /** Opacidad actual de la oscuridad (la anima el tween). */
  private readonly darkness = { value: 0 };
  private tween?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getLights: () => LightSource[] = () => [],
  ) {}

  setIntensity(intensity: number | null | undefined) {
    const clamped = Phaser.Math.Clamp(Number(intensity) || 0, 0, 100);
    const target = (clamped / 100) * MAX_ALPHA;

    if (target > 0) this.ensureObjects();

    this.tween?.stop();
    this.tween = this.scene.tweens.add({
      targets: this.darkness,
      value: target,
      duration: target > this.darkness.value ? FADE_IN_MS : FADE_OUT_MS,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (target <= 0) this.clearObjects();
      },
    });
  }

  /** Un tick del bucle de la escena (LobbyScene.update). */
  update() {
    const rt = this.rt;
    if (!rt || !this.stamp) return;

    const alpha = this.darkness.value;
    if (alpha <= 0.001) {
      rt.setVisible(false);
      return;
    }

    // La textura cubre exactamente lo que ve la cámara, en unidades del
    // mundo: así cada luz se borra en su posición real sin convertir a
    // coordenadas de pantalla, y no importa el zoom ni el desplazamiento.
    const view = this.scene.cameras.main.worldView;
    const width = Math.max(1, Math.ceil(view.width));
    const height = Math.max(1, Math.ceil(view.height));
    if (rt.width !== width || rt.height !== height) rt.resize(width, height);
    rt.setPosition(view.x, view.y).setVisible(true);

    rt.clear();
    rt.fill(0x000000, alpha);

    for (const light of this.getLights()) {
      const size = light.radius * 2 * HOLE_SCALE;
      const x = light.x - view.x;
      const y = light.y - view.y;
      // Fuera de lo visible: no hace falta borrar nada.
      if (x + size / 2 < 0 || y + size / 2 < 0 || x - size / 2 > width || y - size / 2 > height) continue;
      this.stamp.setScale(size / GRADIENT_SIZE);
      rt.erase(this.stamp, x, y);
    }
  }

  destroy() {
    this.tween?.stop();
    this.clearObjects();
  }

  private ensureObjects() {
    if (this.rt) return;
    this.ensureGradientTexture();

    this.rt = this.scene.add
      .renderTexture(0, 0, 1, 1)
      .setOrigin(0, 0)
      .setDepth(AMBIENT_LIGHT_DEPTH)
      .setVisible(false);

    // Sello del degradado: no se agrega a la escena, solo se usa para borrar.
    this.stamp = this.scene.make.image({ key: GRADIENT_KEY, add: false }).setOrigin(0.5);
  }

  private clearObjects() {
    this.rt?.destroy();
    this.rt = undefined;
    this.stamp?.destroy();
    this.stamp = undefined;
  }

  /** Degradado radial blanco → transparente, generado una sola vez. */
  private ensureGradientTexture() {
    if (this.scene.textures.exists(GRADIENT_KEY)) return;
    const canvas = document.createElement("canvas");
    canvas.width = GRADIENT_SIZE;
    canvas.height = GRADIENT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r = GRADIENT_SIZE / 2;
    const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.45, "rgba(255,255,255,0.85)");
    gradient.addColorStop(0.75, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GRADIENT_SIZE, GRADIENT_SIZE);
    this.scene.textures.addCanvas(GRADIENT_KEY, canvas);
  }
}
