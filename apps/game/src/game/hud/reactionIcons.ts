import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Flame, Hand, HandHeart, Laugh, type LucideIcon } from "lucide-react";

// Reacciones rápidas del juego con íconos vectoriales (antes emojis). Viajan
// por el socket como ":wave:" y la burbuja dibuja el SVG; las de clientes
// viejos (emoji) se reconocen igual.
const ICONS: Record<string, LucideIcon> = { wave: Hand, laugh: Laugh, fire: Flame, bye: HandHeart };
const LEGACY: Record<string, string> = { "👋": "wave", "😂": "laugh", "🔥": "fire", "✌️": "bye", "✌": "bye" };

export function reactionToken(action: string) {
  return `:${action}:`;
}

/** Clave de reacción si el mensaje es una reacción rápida; null si es texto. */
export function reactionKey(message: string): string | null {
  const trimmed = message.trim();
  const token = /^:([a-z]+):$/.exec(trimmed)?.[1];
  if (token && ICONS[token]) return token;
  return LEGACY[trimmed] ?? null;
}

const svgCache = new Map<string, string>();

/** SVG del ícono (markup nuestro y estático, nunca texto de un jugador). */
export function reactionSvg(key: string, size = 22): string {
  const cacheKey = `${key}:${size}`;
  let svg = svgCache.get(cacheKey);
  if (!svg) {
    svg = renderToStaticMarkup(createElement(ICONS[key], { size, strokeWidth: 2.25, "aria-hidden": true }));
    svgCache.set(cacheKey, svg);
  }
  return svg;
}
