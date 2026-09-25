import type Phaser from "phaser";

import styles from "./domHud.module.css";
import type { ChatBubbleTheme } from "./nameplateStyles";
import { bubbleThemeVars, nameEffectClass } from "./hudStyleUtils";

export { nameEffectClass };

// Helpers del HUD en HTML (nombre + burbujas) que comparten PlayerHUD y el
// mayordomo (ButlerSystem). El texto con efecto usa las MISMAS clases CSS de
// @codebuddies/visual-effects que el resto de la UI (RarityText), así el
// nombre se ve idéntico en la sala, el chat, el perfil y la tienda.

export { styles as hudStyles };

/**
 * Ancla HTML de tamaño 0 que sigue a un punto del mundo (cámara y zoom los
 * resuelve Phaser). `root` es el nodo donde se cuelga el contenido.
 */
export function createHudAnchor(scene: Phaser.Scene): {
  element: Phaser.GameObjects.DOMElement;
  root: HTMLDivElement;
} {
  const anchor = document.createElement("div");
  anchor.className = styles.anchor;
  const root = document.createElement("div");
  root.className = styles.hud;
  anchor.appendChild(root);

  const element = scene.add.dom(0, 0, anchor).setOrigin(0, 0);
  // Nunca debe tapar clics al mundo (caminar, muebles, otros jugadores).
  element.pointerEvents = "none";
  return { element, root };
}

export interface BubbleOptions {
  message: string;
  theme: ChatBubbleTheme;
  name?: string;
  nameEffectId?: string | null;
  /** Retrato ya compuesto (se copia, el original se reutiliza). */
  face?: HTMLCanvasElement | null;
  /**
   * Reservar el retrato aunque todavía no exista (se pinta después con
   * paintBubbleFace, cuando termina la captura del avatar).
   */
  withFace?: boolean;
}

export function createBubbleElement({ message, theme, name, nameEffectId, face, withFace }: BubbleOptions) {
  const bubble = document.createElement("div");
  const hasFace = !!face || !!withFace;
  bubble.className = [
    styles.bubble,
    theme.tier === "premium" ? styles.premium : "",
    theme.variant ? styles[`fx_${theme.variant}`] : "",
    hasFace ? styles.hasFace : "",
  ].join(" ");
  for (const [prop, value] of Object.entries(bubbleThemeVars(theme))) {
    bubble.style.setProperty(prop, value);
  }

  if (hasFace) {
    const canvas = document.createElement("canvas");
    canvas.width = PORTRAIT_SIZE;
    canvas.height = PORTRAIT_SIZE;
    canvas.className = styles.face;
    bubble.appendChild(canvas);
    if (face) paintCanvas(canvas, face);
  }

  const text = document.createElement("div");
  text.className = styles.text;

  if (name) {
    const nameEl = document.createElement("span");
    const effect = nameEffectClass(nameEffectId);
    nameEl.className = `${styles.bubbleName} ${effect}`;
    if (!effect) nameEl.style.color = theme.nameColor;
    nameEl.textContent = name;
    text.appendChild(nameEl);
  }

  const messageEl = document.createElement("span");
  messageEl.className = styles.message;
  // textContent, nunca innerHTML: el mensaje lo escribe otro jugador.
  messageEl.textContent = message;
  text.appendChild(messageEl);
  bubble.appendChild(text);

  const tail = document.createElement("span");
  tail.className = styles.tail;
  bubble.appendChild(tail);

  return bubble;
}

function paintCanvas(canvas: HTMLCanvasElement, source: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
}

/** Pinta el retrato en una burbuja creada con withFace. */
export function paintBubbleFace(bubble: HTMLElement, face: HTMLCanvasElement) {
  const canvas = bubble.querySelector("canvas");
  if (canvas) paintCanvas(canvas, face);
}

// ---------------------------------------------------------------------------
// Historial de burbujas en cascada (jugadores y mayordomo).
//
// Estilo Habbo: el mensaje nuevo aparece abajo (pegado al nombre) y empuja a
// los anteriores hacia arriba sin que se encimen; aunque nadie escriba, todos
// suben despacio y se desvanecen al llegar arriba o al terminar su vida.
// Cada burbuja se mueve con la propiedad CSS `translate` (independiente de
// la animación de entrada, que usa `transform`), actualizada desde update()
// del HUD solo mientras hay burbujas vivas: como mucho MAX_BUBBLES nodos.
// ---------------------------------------------------------------------------

export const BUBBLE_LIFETIME_MS = 10000;
const BUBBLE_FADE_MS = 1200;
const BUBBLE_DRIFT_PX_PER_S = 7;
const BUBBLE_GAP = 6;
const BUBBLE_MAX_RISE = 260;
const BUBBLE_TOP_FADE_PX = 60;
const MAX_BUBBLES = 6;
// Qué tan rápido alcanza cada burbuja su posición (0..1 por frame).
const BUBBLE_EASE = 0.18;

interface BubbleEntry {
  el: HTMLElement;
  bornAt: number;
  lifetime: number;
  y: number;
  height: number;
}

export class BubbleStack {
  private entries: BubbleEntry[] = [];
  readonly element: HTMLDivElement;

  constructor() {
    this.element = document.createElement("div");
    this.element.className = styles.stack;
  }

  get size() {
    return this.entries.length;
  }

  push(el: HTMLElement, now: number, lifetime = BUBBLE_LIFETIME_MS) {
    this.element.appendChild(el);
    // Una sola lectura de layout por burbuja (al crearla), no por frame.
    const height = el.offsetHeight;
    this.entries.unshift({ el, bornAt: now, lifetime, y: 0, height });

    while (this.entries.length > MAX_BUBBLES) {
      this.entries.pop()?.el.remove();
    }
    this.update(now);
  }

  update(now: number) {
    if (this.entries.length === 0) return;

    let floor = -BUBBLE_GAP;
    const alive: BubbleEntry[] = [];

    for (const entry of this.entries) {
      const age = now - entry.bornAt;
      const drift = (age / 1000) * BUBBLE_DRIFT_PX_PER_S;
      // Nunca por debajo de la burbuja más nueva que tiene debajo.
      const target = Math.max(drift, floor + BUBBLE_GAP);
      entry.y += (target - entry.y) * BUBBLE_EASE;
      floor = entry.y + entry.height;

      let opacity = Math.min(1, (entry.lifetime - age) / BUBBLE_FADE_MS);
      const overTop = entry.y + entry.height - BUBBLE_MAX_RISE;
      if (overTop > 0) opacity = Math.min(opacity, 1 - overTop / BUBBLE_TOP_FADE_PX);

      if (opacity <= 0) {
        entry.el.remove();
        continue;
      }

      entry.el.style.translate = `-50% ${-entry.y.toFixed(1)}px`;
      entry.el.style.opacity = opacity.toFixed(3);
      alive.push(entry);
    }

    this.entries = alive;
  }

  clear() {
    this.entries.forEach((entry) => entry.el.remove());
    this.entries = [];
  }
}

// ---------------------------------------------------------------------------
// Retratos (cara + un poco de cuello) — UNA sola función para todos:
// jugadores y mayordomo pasan su imagen completa a portraitFromCanvas.
//
// Las partes del avatar y los frames de NPC traen márgenes transparentes,
// así que "la parte de arriba del sprite" no es la cabeza. Se busca la
// silueta visible (alfa) y se recorta desde su punto más alto (pelo,
// sombrero), centrado en la cabeza.
// ---------------------------------------------------------------------------

export const PORTRAIT_SIZE = 72;

// Alto del recorte relativo al alto visible del personaje: cabeza + cuello.
const HEAD_FRACTION = 0.5;
// Aire por encima del pelo, relativo al lado del recorte.
const HEAD_TOP_MARGIN = 0.06;
const ALPHA_THRESHOLD = 16;

function portraitFromCanvas(source: HTMLCanvasElement, size = PORTRAIT_SIZE): HTMLCanvasElement | null {
  const ctx = source.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = source;

  let top = -1;
  let bottom = -1;
  try {
    const data = ctx.getImageData(0, 0, width, height).data;
    const rowHasPixels = (y: number) => {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) return true;
      }
      return false;
    };
    for (let y = 0; y < height && top < 0; y++) if (rowHasPixels(y)) top = y;
    for (let y = height - 1; y >= 0 && bottom < 0; y--) if (rowHasPixels(y)) bottom = y;

    if (top < 0) return null;

    const side = Math.max(8, Math.round((bottom - top + 1) * HEAD_FRACTION));
    const cropTop = Math.max(0, Math.round(top - side * HEAD_TOP_MARGIN));

    // Centro horizontal de la cabeza: promedio de los píxeles visibles
    // dentro de la franja del recorte (no del cuerpo entero, que puede
    // tener brazos o accesorios hacia un lado).
    let sumX = 0;
    let count = 0;
    for (let y = cropTop; y < Math.min(height, cropTop + side); y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
          sumX += x;
          count += 1;
        }
      }
    }
    const centerX = count > 0 ? sumX / count : width / 2;
    const cropLeft = Math.round(centerX - side / 2);

    return drawCrop(source, cropLeft, cropTop, side, size);
  } catch {
    // Imagen que no se puede leer (origen sin CORS): recorte proporcional.
    const side = Math.max(8, Math.round(Math.min(width, height * HEAD_FRACTION)));
    return drawCrop(source, Math.round((width - side) / 2), 0, side, size);
  }
}

function drawCrop(source: HTMLCanvasElement, x: number, y: number, side: number, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  // x puede ser negativo (cabeza pegada al borde): drawImage recorta solo.
  ctx.drawImage(source, x, y, side, side, 0, 0, size, size);
  return canvas;
}

// Un frame de NPC siempre da el mismo retrato: se calcula una vez.
const framePortraitCache = new Map<string, HTMLCanvasElement | null>();

/** Retrato a partir de un frame de spritesheet (mayordomo/mascota). */
export function frameToCanvas(frame: Phaser.Textures.Frame | null | undefined, size = PORTRAIT_SIZE) {
  if (!frame) return null;
  const key = `${frame.texture.key}:${frame.name}:${size}`;
  if (framePortraitCache.has(key)) return framePortraitCache.get(key) ?? null;

  const full = document.createElement("canvas");
  full.width = frame.cutWidth;
  full.height = frame.cutHeight;
  const ctx = full.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    frame.source.image as CanvasImageSource,
    frame.cutX,
    frame.cutY,
    frame.cutWidth,
    frame.cutHeight,
    0,
    0,
    frame.cutWidth,
    frame.cutHeight,
  );

  const portrait = portraitFromCanvas(full, size);
  framePortraitCache.set(key, portrait);
  return portrait;
}

/**
 * Retrato del avatar TAL COMO SE VE en la sala: dibuja el contenedor del
 * personaje (todas sus capas, colores y pose) en una textura temporal y
 * le aplica el mismo recorte que al mayordomo. El que llama lo cachea
 * hasta el próximo cambio de avatar.
 */
export function snapshotHead(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Container,
  size = PORTRAIT_SIZE,
): Promise<HTMLCanvasElement | null> {
  const bounds = target.getBounds();
  const width = Math.ceil(bounds.width);
  const height = Math.ceil(bounds.height);
  if (width < 4 || height < 4) return Promise.resolve(null);

  const rt = scene.add.renderTexture(0, 0, width, height).setVisible(false);
  rt.draw(target, target.x - bounds.x, target.y - bounds.y);

  return new Promise((resolve) => {
    rt.snapshot((image) => {
      rt.destroy();
      if (!(image instanceof HTMLImageElement)) return resolve(null);
      const crop = () => {
        const full = document.createElement("canvas");
        full.width = width;
        full.height = height;
        const ctx = full.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(image, 0, 0);
        resolve(portraitFromCanvas(full, size));
      };
      if (image.complete) crop();
      else image.onload = crop;
    });
  });
}
