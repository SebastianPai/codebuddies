import Phaser from "phaser";
import { getEffectDefinition, VISUAL_EFFECTS } from "@codebuddies/visual-effects";

import styles from "./domHud.module.css";
import type { ChatBubbleTheme } from "./nameplateStyles";

// Helpers del HUD en HTML (nombre + burbujas) que comparten PlayerHUD y el
// mayordomo (ButlerSystem). El texto con efecto usa las MISMAS clases CSS de
// @codebuddies/visual-effects que el resto de la UI (RarityText), así el
// nombre se ve idéntico en la sala, el chat, el perfil y la tienda.

export { styles as hudStyles };

/** Clase CSS del efecto de nombre, o "" si no hay efecto (o es "common"). */
export function nameEffectClass(effectId: string | null | undefined): string {
  if (!effectId || effectId === "common" || !(effectId in VISUAL_EFFECTS)) return "";
  return getEffectDefinition(effectId).textClassName;
}

function hexNumberToCss(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
}

export function createBubbleElement({ message, theme, name, nameEffectId, face }: BubbleOptions) {
  const bubble = document.createElement("div");
  bubble.className = `${styles.bubble} ${theme.tier === "premium" ? styles.premium : ""}`;
  bubble.style.setProperty("--cbh-bg", hexNumberToCss(theme.backgroundColor, theme.backgroundAlpha));
  bubble.style.setProperty("--cbh-border", hexNumberToCss(theme.borderColor));
  bubble.style.setProperty("--cbh-fg", theme.textColor);

  if (face) {
    const canvas = document.createElement("canvas");
    canvas.width = face.width;
    canvas.height = face.height;
    canvas.className = styles.face;
    canvas.getContext("2d")?.drawImage(face, 0, 0);
    bubble.appendChild(canvas);
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

/** Saca una burbuja con transición y la elimina del DOM al terminar. */
export function removeBubbleElement(bubble: HTMLElement) {
  bubble.classList.add(styles.bubbleLeaving);
  window.setTimeout(() => bubble.remove(), 220);
}

/**
 * Retrato a partir de un frame de spritesheet (mayordomo/mascota): recorta
 * el cuadro actual y lo encaja centrado sin deformar.
 */
export function frameToCanvas(frame: Phaser.Textures.Frame | null | undefined, size = 52) {
  if (!frame) return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  const scale = Math.min(size / frame.cutWidth, size / frame.cutHeight);
  const w = frame.cutWidth * scale;
  const h = frame.cutHeight * scale;
  ctx.drawImage(
    frame.source.image as CanvasImageSource,
    frame.cutX,
    frame.cutY,
    frame.cutWidth,
    frame.cutHeight,
    (size - w) / 2,
    (size - h) / 2,
    w,
    h,
  );
  return canvas;
}

/**
 * Retrato circular a partir de capas de textura ya cargadas en Phaser
 * (cara del avatar). Se dibuja una vez por cambio de avatar y cada burbuja
 * lo copia con drawImage; nunca se lee el canvas, así que no importa si
 * alguna imagen vino de otro dominio sin CORS.
 */
export function composeFaceCanvas(
  scene: Phaser.Scene,
  layers: Array<{ key: string; tint: number | null }>,
  size = 52,
): HTMLCanvasElement | null {
  if (layers.length === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  const scratch = document.createElement("canvas");
  scratch.width = size;
  scratch.height = size;
  const sctx = scratch.getContext("2d");
  if (!sctx) return null;
  sctx.imageSmoothingEnabled = false;

  for (const layer of layers) {
    if (!scene.textures.exists(layer.key)) continue;
    const source = scene.textures.get(layer.key).getSourceImage() as CanvasImageSource;
    if (!layer.tint) {
      ctx.drawImage(source, 0, 0, size, size);
      continue;
    }
    // Tinte multiplicativo (igual que setTint de Phaser) conservando el
    // alfa de la capa.
    sctx.globalCompositeOperation = "source-over";
    sctx.clearRect(0, 0, size, size);
    sctx.drawImage(source, 0, 0, size, size);
    sctx.globalCompositeOperation = "multiply";
    sctx.fillStyle = hexNumberToCss(layer.tint);
    sctx.fillRect(0, 0, size, size);
    sctx.globalCompositeOperation = "destination-in";
    sctx.drawImage(source, 0, 0, size, size);
    ctx.drawImage(scratch, 0, 0);
  }
  return canvas;
}
