import { getEffectDefinition, VISUAL_EFFECTS } from "@codebuddies/visual-effects";

import type { ChatBubbleTheme } from "./nameplateStyles";

// Sin Phaser a propósito: lo usan tanto el HUD del juego (domHud.ts) como
// componentes React (vista previa de la tienda), que no deben arrastrar el
// motor a su bundle.

/** Clase CSS del efecto de nombre, o "" si no hay efecto (o es "common"). */
export function nameEffectClass(effectId: string | null | undefined): string {
  if (!effectId || effectId === "common" || !(effectId in VISUAL_EFFECTS)) return "";
  return getEffectDefinition(effectId).textClassName;
}

export function hexNumberToCss(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Variables CSS que consume .bubble (domHud.module.css) para un tema. */
export function bubbleThemeVars(theme: ChatBubbleTheme): Record<string, string> {
  return {
    "--cbh-bg": hexNumberToCss(theme.backgroundColor, theme.backgroundAlpha),
    "--cbh-border": hexNumberToCss(theme.borderColor),
    "--cbh-fg": theme.textColor,
  };
}

const VARIANT_SWATCH_BACKGROUND: Record<string, string> = {
  aurora: "linear-gradient(135deg, #22d3ee, #818cf8, #f472b6)",
  fire: "linear-gradient(135deg, #ef4444, #f97316, #facc15)",
  galaxy:
    "radial-gradient(1px 1px at 30% 30%, #fff 60%, transparent 61%), radial-gradient(1px 1px at 70% 65%, #fff 60%, transparent 61%), #1e1b4b",
  holo: "linear-gradient(120deg, #fdf4ff, #ecfeff, #fefce8)",
};

/**
 * Estilo de la muestra (botón chico) de un tema en los selectores de Ajustes
 * y de la barra de chat: refleja el diseño especial, sin animación.
 */
export function themeSwatchStyle(theme: ChatBubbleTheme): Record<string, string> {
  const hex = (color: number) => `#${color.toString(16).padStart(6, "0")}`;
  return {
    background: (theme.variant && VARIANT_SWATCH_BACKGROUND[theme.variant]) || hex(theme.backgroundColor),
    borderColor: hex(theme.borderColor),
    ...(theme.variant === "neon" ? { boxShadow: "0 0 8px rgba(34, 211, 238, 0.7)" } : {}),
    ...(theme.variant === "pixel" ? { borderRadius: "2px" } : {}),
  };
}

// Un tema de burbuja comprable es un Item EFFECT con effectKey
// "bubble:<themeId>" (mismo prefijo que IdentityService en apps/api).
export const CHAT_BUBBLE_EFFECT_PREFIX = "bubble:";

export function bubbleThemeIdFromEffectKey(effectKey: string | null | undefined): string | null {
  return effectKey?.startsWith(CHAT_BUBBLE_EFFECT_PREFIX)
    ? effectKey.slice(CHAT_BUBBLE_EFFECT_PREFIX.length)
    : null;
}
