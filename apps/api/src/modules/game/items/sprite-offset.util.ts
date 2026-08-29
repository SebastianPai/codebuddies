// Fuente única de verdad del rango válido de `spriteOffsetX` / `spriteOffsetY`
// de un world item (calibración visual del artwork: corre solo el sprite en
// pantalla, no el footprint/anclaje/colisión). Compartida por ItemsService
// (alta + edición del item) y WorldItemDataService (config avanzada de
// /admin/world-items) para que ninguna de las dos rutas pueda guardar un
// valor fuera de rango o no entero.

export const SPRITE_OFFSET_LIMIT = 1000;

/**
 * Normaliza un offset de sprite a un entero dentro de
 * [-SPRITE_OFFSET_LIMIT, SPRITE_OFFSET_LIMIT]. Valores no numéricos → 0.
 * Los decimales se truncan (subpíxeles = artefactos de render en pixel-art).
 */
export function clampSpriteOffset(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(-SPRITE_OFFSET_LIMIT, Math.min(SPRITE_OFFSET_LIMIT, n));
}
