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

// Un tema de burbuja comprable es un Item EFFECT con effectKey
// "bubble:<themeId>" (mismo prefijo que IdentityService en apps/api).
export const CHAT_BUBBLE_EFFECT_PREFIX = "bubble:";

export function bubbleThemeIdFromEffectKey(effectKey: string | null | undefined): string | null {
  return effectKey?.startsWith(CHAT_BUBBLE_EFFECT_PREFIX)
    ? effectKey.slice(CHAT_BUBBLE_EFFECT_PREFIX.length)
    : null;
}
