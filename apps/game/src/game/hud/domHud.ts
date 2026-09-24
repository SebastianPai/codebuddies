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

/** Saca una burbuja con transición y la elimina del DOM al terminar. */
export function removeBubbleElement(bubble: HTMLElement) {
  bubble.classList.add(styles.bubbleLeaving);
  window.setTimeout(() => bubble.remove(), 220);
}

// Recorte de "retrato" (cara + un poco de cuello): cuadrado del ancho de la
// cabeza, pegado arriba del personaje. Valores sobre el alto total del
// sprite; los avatares y NPCs del juego tienen la cabeza en ~el 40% superior.
const HEAD_CROP_HEIGHT = 0.44;
const HEAD_CROP_TOP = 0.02;
export const PORTRAIT_SIZE = 72;

function headCropRect(width: number, height: number) {
  const side = Math.max(1, Math.min(width, height * HEAD_CROP_HEIGHT));
  return {
    x: Math.max(0, (width - side) / 2),
    y: Math.max(0, height * HEAD_CROP_TOP),
    side,
  };
}

/**
 * Retrato a partir de un frame de spritesheet (mayordomo/mascota): recorta
 * cabeza y cuello del cuadro actual.
 */
export function frameToCanvas(frame: Phaser.Textures.Frame | null | undefined, size = PORTRAIT_SIZE) {
  if (!frame) return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  const crop = headCropRect(frame.cutWidth, frame.cutHeight);
  ctx.drawImage(
    frame.source.image as CanvasImageSource,
    frame.cutX + crop.x,
    frame.cutY + crop.y,
    crop.side,
    crop.side,
    0,
    0,
    size,
    size,
  );
  return canvas;
}

/**
 * Retrato del avatar TAL COMO SE VE en la sala: dibuja el contenedor del
 * personaje (todas sus capas, colores y pose actuales) en una textura
 * temporal y recorta cabeza y cuello. Antes se apilaban las texturas
 * completas de cada parte reducidas a un círculo, y como muchas son hojas
 * con varios cuadros, la cara salía diminuta o no salía.
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

  const crop = headCropRect(width, height);
  return new Promise((resolve) => {
    rt.snapshotArea(
      Math.round(crop.x),
      Math.round(crop.y),
      Math.round(crop.side),
      Math.round(crop.side),
      (image) => {
        rt.destroy();
        if (!(image instanceof HTMLImageElement)) return resolve(null);
        const draw = () => {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(image, 0, 0, size, size);
          resolve(canvas);
        };
        if (image.complete) draw();
        else image.onload = draw;
      },
    );
  });
}

