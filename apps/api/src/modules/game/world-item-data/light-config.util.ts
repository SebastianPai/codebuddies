// Forma de la luz de un objeto (WorldItemData.lightConfig). La lee el juego
// para dibujar el agujero de luz en la oscuridad de la sala
// (apps/game/src/game/systems/AmbientLightOverlay.ts).
//
//   shape     "CIRCLE" (redonda) | "CONE" (porción de pizza)
//   originX   px desde el centro-abajo del sprite, + a la derecha
//   originY   px desde el centro-abajo del sprite, + hacia abajo (negativo = más alto)
//   direction grados en pantalla hacia donde apunta el cono (0 = derecha, 90 = abajo)
//   spread    apertura del cono en grados
//
// Nunca se guarda el JSON crudo del cliente: se reconstruye campo por campo
// con rangos fijos, igual que buildSpriteOffsetData.

export type LightConfig = {
  shape: 'CIRCLE' | 'CONE';
  originX: number;
  originY: number;
  direction: number;
  spread: number;
};

const ORIGIN_LIMIT = 1000;
const MIN_SPREAD = 10;
const MAX_SPREAD = 180;

function num(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** null = sin config (luz redonda centrada, el comportamiento de siempre). */
export function sanitizeLightConfig(raw: unknown): LightConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;
  const direction = num(input.direction, 90, -3600, 3600);
  return {
    shape: input.shape === 'CONE' ? 'CONE' : 'CIRCLE',
    originX: num(input.originX, 0, -ORIGIN_LIMIT, ORIGIN_LIMIT),
    originY: num(input.originY, 0, -ORIGIN_LIMIT, ORIGIN_LIMIT),
    direction: ((direction % 360) + 360) % 360,
    spread: num(input.spread, 70, MIN_SPREAD, MAX_SPREAD),
  };
}
