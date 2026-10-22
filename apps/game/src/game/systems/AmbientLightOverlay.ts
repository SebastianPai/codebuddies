import Phaser from "phaser";
import { AMBIENT_LIGHT_DEPTH } from "../utils/depth";

// Iluminación de la sala: oscuridad (pestaña "Iluminación" de Editar Mundo)
// + luces de los objetos (lámparas encendidas, velas, faroles…).
//
// Dos capas por luz:
//   1. AGUJERO en la oscuridad: un rectángulo azul noche con una BitmapMask
//      invertida hecha con un degradado por luz. Donde hay luz, la oscuridad
//      se abre y se ven los colores reales de la sala. (Se probó
//      RenderTexture.erase() y en Phaser 3.90 no agujereaba.)
//   2. BRILLO del color de la luz: el mismo degradado, teñido y en modo
//      aditivo, MUY suave. Antes había un PointLight casi blanco y fuerte
//      que quemaba el centro en un blob blanco.
//
// Para que se vea natural en isométrico:
//   - Las luces redondas son ÓVALOS achatados (un charco de luz en el piso),
//     no círculos perfectos pegados a la pantalla.
//   - La caída es gradual (varios escalones en el degradado), sin borde duro.
//   - Parpadeo leve y distinto por luz, como una llama.
//
// LIVIANO: una textura de degradado de 256px generada una vez, conos
// cacheados por apertura y pools de imágenes reutilizadas: no se crea nada
// por frame. Sin luces ni oscuridad, no se dibuja nada.

// Tope de opacidad: a intensidad 100 la sala sigue siendo jugable.
const MAX_ALPHA = 0.82;
const FADE_IN_MS = 400;
const FADE_OUT_MS = 300;
// Azul noche en vez de negro plano: la oscuridad se siente ambiente, no apagón.
const DARKNESS_COLOR = 0x070b1a;

const GRADIENT_KEY = "cb-light-gradient-v2";
const GRADIENT_SIZE = 256;
const CONE_SIZE = 512;
// El agujero es algo más grande que el radio nominal: el borde del degradado
// es casi transparente, así se percibe una luz del tamaño pedido.
const HOLE_SCALE = 1.35;
// Achatado del charco de luz en el piso (perspectiva isométrica 2:1).
const FLOOR_SQUASH = 0.62;
// Brillo del color: sutil con la sala iluminada, más presente a oscuras.
const GLOW_ALPHA_LIT = 0.1;
const GLOW_ALPHA_DARK = 0.38;
const GLOW_SCALE = 0.85;

/**
 * Una fuente de luz en coordenadas del MUNDO. `cone` = porción de pizza que
 * sale de (x, y) hacia `direction` (grados en pantalla, 0 = derecha, 90 =
 * abajo) con una apertura de `spread` grados. Sin `cone`, charco ovalado.
 */
export type LightSource = {
  x: number;
  y: number;
  radius: number;
  /** Color de la luz (0xRRGGBB). Por defecto, cálida. */
  color?: number;
  cone?: { direction: number; spread: number };
};

export default class AmbientLightOverlay {
  private rect?: Phaser.GameObjects.Rectangle;
  private maskSource?: Phaser.GameObjects.Container;
  private mask?: Phaser.Display.Masks.BitmapMask;
  private readonly holes: Phaser.GameObjects.Image[] = [];
  private readonly glows: Phaser.GameObjects.Image[] = [];
  private tween?: Phaser.Tweens.Tween;
  /** Oscuridad objetivo/actual en 0..1 (relativa a MAX_ALPHA). */
  private darkness = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getLights: () => LightSource[] = () => [],
  ) {}

  setIntensity(intensity: number | null | undefined) {
    const clamped = Phaser.Math.Clamp(Number(intensity) || 0, 0, 100);
    const target = (clamped / 100) * MAX_ALPHA;

    if (target > 0) this.ensureDarkness();
    const rect = this.rect;
    if (!rect) return;

    this.tween?.stop();
    this.tween = this.scene.tweens.add({
      targets: rect,
      alpha: target,
      duration: target > rect.alpha ? FADE_IN_MS : FADE_OUT_MS,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (target <= 0) this.clearDarkness();
      },
    });
  }

  /** Un tick del bucle de la escena (LobbyScene.update). */
  update() {
    const lights = this.getLights();
    const rect = this.rect;
    this.darkness = rect ? Phaser.Math.Clamp(rect.alpha / MAX_ALPHA, 0, 1) : 0;

    if (lights.length === 0 && !rect) {
      this.hideFrom(this.glows, 0);
      return;
    }

    this.ensureGradientTexture();
    const now = this.scene.time.now;

    if (rect && this.maskSource) {
      // La oscuridad cubre exactamente lo que ve la cámara, en coordenadas
      // del mundo: no importa el zoom ni hacia dónde mire.
      const view = this.scene.cameras.main.worldView;
      rect.setPosition(view.x, view.y).setSize(Math.ceil(view.width) + 2, Math.ceil(view.height) + 2);
    }

    const glowAlpha = GLOW_ALPHA_LIT + (GLOW_ALPHA_DARK - GLOW_ALPHA_LIT) * this.darkness;

    lights.forEach((light, i) => {
      const flicker = this.flicker(light, now);

      if (rect && this.maskSource) {
        const hole = this.imageAt(this.holes, i, false);
        this.placeLight(hole, light, HOLE_SCALE * flicker);
      }

      const glow = this.imageAt(this.glows, i, true);
      this.placeLight(glow, light, GLOW_SCALE * flicker);
      glow.setTint(light.color ?? 0xffd59a).setAlpha(glowAlpha * (0.85 + 0.15 * flicker));
    });

    this.hideFrom(this.holes, lights.length);
    this.hideFrom(this.glows, lights.length);
  }

  destroy() {
    this.tween?.stop();
    this.clearDarkness();
    this.glows.forEach((glow) => glow.destroy());
    this.glows.length = 0;
  }

  /** Posición, forma y tamaño de una luz (charco ovalado o cono). */
  private placeLight(image: Phaser.GameObjects.Image, light: LightSource, scale: number) {
    image.setVisible(true).setPosition(light.x, light.y);
    if (light.cone) {
      const key = this.ensureConeTexture(light.cone.spread);
      if (image.texture.key !== key) image.setTexture(key);
      image
        .setRotation(Phaser.Math.DegToRad(light.cone.direction))
        // El cono tiene el vértice en el centro del lienzo (radio = la mitad).
        .setScale((light.radius * 2 * scale) / CONE_SIZE);
    } else {
      if (image.texture.key !== GRADIENT_KEY) image.setTexture(GRADIENT_KEY);
      const s = (light.radius * 2 * scale) / GRADIENT_SIZE;
      image.setRotation(0).setScale(s, s * FLOOR_SQUASH);
    }
  }

  /**
   * Parpadeo leve (±4%) y distinto por luz: la fase sale de su posición, así
   * dos lámparas no laten sincronizadas.
   */
  private flicker(light: LightSource, now: number) {
    const phase = (light.x * 12.9898 + light.y * 78.233) % (Math.PI * 2);
    return 1 + 0.025 * Math.sin(now * 0.008 + phase) + 0.015 * Math.sin(now * 0.021 + phase * 1.7);
  }

  /** Imagen i del pool (la crea la primera vez). `glow` = brillo visible. */
  private imageAt(pool: Phaser.GameObjects.Image[], i: number, glow: boolean) {
    let image = pool[i];
    if (image) return image;

    if (glow) {
      image = this.scene.add
        .image(0, 0, GRADIENT_KEY)
        .setOrigin(0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(AMBIENT_LIGHT_DEPTH + 1);
    } else {
      // Agujero: NO va a la escena, solo define la máscara.
      image = this.scene.make.image({ key: GRADIENT_KEY, add: false }).setOrigin(0.5);
      this.maskSource?.add(image);
    }
    pool.push(image);
    return image;
  }

  private hideFrom(pool: Phaser.GameObjects.Image[], from: number) {
    for (let i = from; i < pool.length; i++) pool[i].setVisible(false);
  }

  private ensureDarkness() {
    if (this.rect) return;
    this.ensureGradientTexture();

    this.rect = this.scene.add
      .rectangle(0, 0, 1, 1, DARKNESS_COLOR)
      .setOrigin(0, 0)
      .setDepth(AMBIENT_LIGHT_DEPTH)
      .setAlpha(0);

    this.maskSource = this.scene.make.container({ x: 0, y: 0, add: false });
    this.mask = new Phaser.Display.Masks.BitmapMask(this.scene, this.maskSource);
    // Invertida: la oscuridad se ve donde la máscara está vacía y desaparece
    // donde hay degradado (las luces).
    this.mask.invertAlpha = true;
    this.rect.setMask(this.mask);
  }

  private clearDarkness() {
    this.rect?.clearMask();
    this.mask?.destroy();
    this.mask = undefined;
    this.holes.length = 0;
    this.maskSource?.destroy(); // destruye también las imágenes de los agujeros
    this.maskSource = undefined;
    this.rect?.destroy();
    this.rect = undefined;
  }

  /** Paradas del degradado: centro pleno y caída larga y suave, sin borde. */
  private static paintFalloff(gradient: CanvasGradient) {
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.18, "rgba(255,255,255,0.92)");
    gradient.addColorStop(0.38, "rgba(255,255,255,0.68)");
    gradient.addColorStop(0.58, "rgba(255,255,255,0.4)");
    gradient.addColorStop(0.78, "rgba(255,255,255,0.15)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
  }

  /**
   * Cono ("porción de pizza") apuntando a la derecha, con el vértice en el
   * centro del lienzo. La apertura se redondea de a 5° para cachear pocas
   * texturas aunque cada objeto use un valor distinto.
   */
  private ensureConeTexture(spread: number): string {
    const step = Phaser.Math.Clamp(Math.round(spread / 5) * 5, 10, 180);
    const key = `cb-light-cone-v2-${step}`;
    if (this.scene.textures.exists(key)) return key;

    const canvas = document.createElement("canvas");
    canvas.width = CONE_SIZE;
    canvas.height = CONE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return GRADIENT_KEY;
    const c = CONE_SIZE / 2;
    const half = Phaser.Math.DegToRad(step) / 2;
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
    AmbientLightOverlay.paintFalloff(gradient);
    // Bordes laterales suaves (donde el navegador soporta filter en canvas).
    ctx.filter = "blur(10px)";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, c - 14, -half, half);
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
    AmbientLightOverlay.paintFalloff(gradient);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GRADIENT_SIZE, GRADIENT_SIZE);
    this.scene.textures.addCanvas(GRADIENT_KEY, canvas);
  }
}
