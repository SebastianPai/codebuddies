import Phaser from "phaser";
import { AMBIENT_LIGHT_DEPTH } from "../utils/depth";

// Oscuridad de la sala (pestaña "Iluminación" de Editar Mundo) CON luces.
//
// Antes era un rectángulo negro encima de todo: las lámparas encendidas
// brillaban DEBAJO de él, así que con la sala a oscuras no iluminaban nada.
// Ahora el rectángulo lleva una MÁSCARA INVERTIDA hecha con un degradado
// suave por cada fuente de luz: donde hay luz el negro desaparece y se ve
// el brillo de color que hay debajo (ver RoomItemsManager.applyItemState).
//
// Por qué máscara y no RenderTexture.erase(): se probó en el juego real y en
// Phaser 3.90 el erase sobre la textura no dejaba ningún agujero. La
// BitmapMask invertida es el camino estándar de Phaser para esto y funciona.
//
// LIVIANO: un solo rectángulo del tamaño de lo que ve la cámara, una textura
// de degradado de 256px generada una vez, y un pool de imágenes que se
// reutilizan (no se crea nada nuevo por frame). Sin oscuridad no se dibuja.
//
// Tope de opacidad: a intensidad 100 la sala debe seguir siendo jugable
// (verse muebles/otros jugadores), no un rectángulo negro opaco.
const MAX_ALPHA = 0.82;
const FADE_IN_MS = 400;
const FADE_OUT_MS = 300;

const GRADIENT_KEY = "cb-light-gradient";
const GRADIENT_SIZE = 256;
const CONE_SIZE = 512;
// El agujero es algo más grande que el radio nominal: el borde del degradado
// es casi transparente, así se nota un círculo de luz del tamaño pedido.
const HOLE_SCALE = 1.25;

/**
 * Una fuente de luz en coordenadas del MUNDO. `cone` = porción de pizza que
 * sale de (x, y) hacia `direction` (grados en pantalla, 0 = derecha, 90 =
 * abajo) con una apertura de `spread` grados. Sin `cone`, círculo.
 */
export type LightSource = {
  x: number;
  y: number;
  radius: number;
  cone?: { direction: number; spread: number };
};

export default class AmbientLightOverlay {
  private rect?: Phaser.GameObjects.Rectangle;
  private maskSource?: Phaser.GameObjects.Container;
  private mask?: Phaser.Display.Masks.BitmapMask;
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private tween?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getLights: () => LightSource[] = () => [],
  ) {}

  setIntensity(intensity: number | null | undefined) {
    const clamped = Phaser.Math.Clamp(Number(intensity) || 0, 0, 100);
    const target = (clamped / 100) * MAX_ALPHA;

    if (target > 0) this.ensureObjects();
    const rect = this.rect;
    if (!rect) return;

    this.tween?.stop();
    this.tween = this.scene.tweens.add({
      targets: rect,
      alpha: target,
      duration: target > rect.alpha ? FADE_IN_MS : FADE_OUT_MS,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (target <= 0) this.clearObjects();
      },
    });
  }

  /** Un tick del bucle de la escena (LobbyScene.update). */
  update() {
    const rect = this.rect;
    if (!rect || !this.maskSource) return;
    if (rect.alpha <= 0.001) return;

    // El rectángulo cubre exactamente lo que ve la cámara, en coordenadas
    // del mundo: no importa el zoom ni hacia dónde mire.
    const view = this.scene.cameras.main.worldView;
    rect.setPosition(view.x, view.y).setSize(Math.ceil(view.width) + 2, Math.ceil(view.height) + 2);

    const lights = this.getLights();
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      let image = this.pool[i];
      if (!image) {
        image = this.scene.make.image({ key: GRADIENT_KEY, add: false }).setOrigin(0.5);
        this.pool.push(image);
        this.maskSource.add(image);
      }
      if (light.cone) {
        const key = this.ensureConeTexture(light.cone.spread);
        if (image.texture.key !== key) image.setTexture(key);
        image
          .setVisible(true)
          .setPosition(light.x, light.y)
          .setRotation(Phaser.Math.DegToRad(light.cone.direction))
          // El cono tiene el vértice en el centro del lienzo (radio = la mitad).
          .setScale((light.radius * 2 * HOLE_SCALE) / CONE_SIZE);
      } else {
        if (image.texture.key !== GRADIENT_KEY) image.setTexture(GRADIENT_KEY);
        image
          .setVisible(true)
          .setPosition(light.x, light.y)
          .setRotation(0)
          .setScale((light.radius * 2 * HOLE_SCALE) / GRADIENT_SIZE);
      }
    }
    // Las que sobran se esconden (se reusan si después hay más luces).
    for (let i = lights.length; i < this.pool.length; i++) this.pool[i].setVisible(false);
  }

  destroy() {
    this.tween?.stop();
    this.clearObjects();
  }

  private ensureObjects() {
    if (this.rect) return;
    this.ensureGradientTexture();

    this.rect = this.scene.add
      .rectangle(0, 0, 1, 1, 0x000000)
      .setOrigin(0, 0)
      .setDepth(AMBIENT_LIGHT_DEPTH)
      .setAlpha(0);

    // Fuente de la máscara: NO va a la escena, solo define dónde hay luz.
    this.maskSource = this.scene.make.container({ x: 0, y: 0, add: false });
    this.mask = new Phaser.Display.Masks.BitmapMask(this.scene, this.maskSource);
    // Invertida: el negro se ve donde la máscara está vacía y desaparece
    // donde hay degradado (las luces).
    this.mask.invertAlpha = true;
    this.rect.setMask(this.mask);
    this.update();
  }

  private clearObjects() {
    this.rect?.clearMask();
    this.mask?.destroy();
    this.mask = undefined;
    this.pool.length = 0;
    this.maskSource?.destroy(); // destruye también las imágenes del pool
    this.maskSource = undefined;
    this.rect?.destroy();
    this.rect = undefined;
  }

  /**
   * Cono ("porción de pizza") apuntando a la derecha, con el vértice en el
   * centro del lienzo. La apertura se redondea de a 5° para cachear pocas
   * texturas aunque cada objeto use un valor distinto.
   */
  private ensureConeTexture(spread: number): string {
    const step = Phaser.Math.Clamp(Math.round(spread / 5) * 5, 10, 180);
    const key = `cb-light-cone-${step}`;
    if (this.scene.textures.exists(key)) return key;

    const canvas = document.createElement("canvas");
    canvas.width = CONE_SIZE;
    canvas.height = CONE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return GRADIENT_KEY;
    const c = CONE_SIZE / 2;
    const half = Phaser.Math.DegToRad(step) / 2;
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.8)");
    gradient.addColorStop(0.8, "rgba(255,255,255,0.3)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    // Bordes laterales suaves (donde el navegador soporta filter en canvas).
    ctx.filter = "blur(6px)";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, c - 8, -half, half);
    ctx.closePath();
    ctx.fill();
    this.scene.textures.addCanvas(key, canvas);
    return key;
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
