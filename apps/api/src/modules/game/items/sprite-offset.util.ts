// Fuente única de verdad de la calibración visual del artwork de un world
// item: corre solo el sprite en pantalla (en píxeles), no el footprint /
// anclaje / colisión. Compartida por ItemsService (alta + edición) y
// WorldItemDataService (config avanzada de /admin/world-items).
//
// El offset es POR DIRECCIÓN (NORTH/EAST/SOUTH/WEST) porque cada frame del
// spritesheet puede traer padding distinto: un mismo par X/Y que alinea bien
// NORTH/SOUTH suele quedar corrido en EAST/WEST. `spriteOffsetSync` decide
// cuántos valores independientes hay:
//   - "all"    → 1 valor para las 4 direcciones
//   - "mirror" → 2 valores: NORTH=SOUTH y EAST=WEST (default, igual criterio
//                que `syncDirections` del footprint)
//   - "none"   → 4 valores independientes
//
// `spriteOffsetX` / `spriteOffsetY` (columnas escalares) se siguen
// escribiendo con el valor de SOUTH como fallback para lectores viejos y
// para items guardados antes de existir el mapa.

export const SPRITE_OFFSET_LIMIT = 1000;

export const SPRITE_OFFSET_DIRECTIONS = [
  'NORTH',
  'EAST',
  'SOUTH',
  'WEST',
] as const;

export type SpriteOffsetDirection = (typeof SPRITE_OFFSET_DIRECTIONS)[number];
export type SpriteOffset = { x: number; y: number };
export type SpriteOffsetMap = Record<SpriteOffsetDirection, SpriteOffset>;
export type SpriteOffsetSync = 'all' | 'mirror' | 'none';

// Qué dirección "manda" sobre su espejo al resolver el modo "mirror".
const MIRROR_SOURCE: Record<SpriteOffsetDirection, SpriteOffsetDirection> = {
  NORTH: 'NORTH',
  SOUTH: 'NORTH',
  EAST: 'EAST',
  WEST: 'EAST',
};

/**
 * Normaliza un offset escalar a un entero dentro de
 * [-SPRITE_OFFSET_LIMIT, SPRITE_OFFSET_LIMIT]. No numérico → 0. Decimales se
 * truncan (subpíxeles = artefactos de render en pixel-art).
 */
export function clampSpriteOffset(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(-SPRITE_OFFSET_LIMIT, Math.min(SPRITE_OFFSET_LIMIT, n));
}

function coerceOffset(raw: unknown): SpriteOffset {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return { x: clampSpriteOffset(source.x), y: clampSpriteOffset(source.y) };
}

export function normalizeSpriteOffsetSync(value: unknown): SpriteOffsetSync {
  return value === 'all' || value === 'none' ? value : 'mirror';
}

/**
 * Fuerza la relación entre direcciones que impone el modo de sync, para que
 * lo guardado sea siempre coherente aunque el form haya mandado un mapa
 * parcial o desalineado.
 */
export function applySpriteOffsetSync(
  map: SpriteOffsetMap,
  sync: SpriteOffsetSync,
): SpriteOffsetMap {
  if (sync === 'all') {
    const base = map.SOUTH ?? map.NORTH ?? { x: 0, y: 0 };
    return {
      NORTH: { ...base },
      EAST: { ...base },
      SOUTH: { ...base },
      WEST: { ...base },
    };
  }

  if (sync === 'mirror') {
    return SPRITE_OFFSET_DIRECTIONS.reduce((acc, dir) => {
      acc[dir] = { ...map[MIRROR_SOURCE[dir]] };
      return acc;
    }, {} as SpriteOffsetMap);
  }

  return {
    NORTH: { ...map.NORTH },
    EAST: { ...map.EAST },
    SOUTH: { ...map.SOUTH },
    WEST: { ...map.WEST },
  };
}

/**
 * Construye el mapa completo de 4 direcciones a partir de lo que haya
 * llegado (mapa entero, parcial, o nada), completando huecos con `fallback`
 * y aplicando el sync.
 */
export function normalizeSpriteOffsetMap(
  raw: unknown,
  sync: SpriteOffsetSync,
  fallback: SpriteOffset = { x: 0, y: 0 },
): SpriteOffsetMap {
  const source =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const clampedFallback: SpriteOffset = {
    x: clampSpriteOffset(fallback.x),
    y: clampSpriteOffset(fallback.y),
  };

  const map = SPRITE_OFFSET_DIRECTIONS.reduce((acc, dir) => {
    acc[dir] =
      source[dir] != null ? coerceOffset(source[dir]) : { ...clampedFallback };
    return acc;
  }, {} as SpriteOffsetMap);

  return applySpriteOffsetSync(map, sync);
}

/** Valor escalar legacy que se guarda en spriteOffsetX/Y (= SOUTH). */
export function spriteOffsetScalars(map: SpriteOffsetMap): SpriteOffset {
  return { x: map.SOUTH.x, y: map.SOUTH.y };
}

/**
 * Arma el bloque coherente
 * { spriteOffsets, spriteOffsetSync, spriteOffsetX, spriteOffsetY } listo
 * para persistir, a partir de lo que mandó el form. `existing` cubre el
 * update parcial (ej: cambia solo el sync sin re-mandar el mapa).
 */
export function buildSpriteOffsetData(input: {
  spriteOffsets?: unknown;
  spriteOffsetSync?: unknown;
  spriteOffsetX?: unknown;
  spriteOffsetY?: unknown;
  existing?: {
    spriteOffsets?: unknown;
    spriteOffsetSync?: unknown;
    spriteOffsetX?: number | null;
    spriteOffsetY?: number | null;
  } | null;
}): {
  spriteOffsets: SpriteOffsetMap;
  spriteOffsetSync: SpriteOffsetSync;
  spriteOffsetX: number;
  spriteOffsetY: number;
} {
  const sync = normalizeSpriteOffsetSync(
    input.spriteOffsetSync ?? input.existing?.spriteOffsetSync,
  );
  const rawMap = input.spriteOffsets ?? input.existing?.spriteOffsets ?? undefined;
  const fallback: SpriteOffset = {
    x: clampSpriteOffset(input.spriteOffsetX ?? input.existing?.spriteOffsetX ?? 0),
    y: clampSpriteOffset(input.spriteOffsetY ?? input.existing?.spriteOffsetY ?? 0),
  };
  const spriteOffsets = normalizeSpriteOffsetMap(rawMap, sync, fallback);
  const scalars = spriteOffsetScalars(spriteOffsets);

  return {
    spriteOffsets,
    spriteOffsetSync: sync,
    spriteOffsetX: scalars.x,
    spriteOffsetY: scalars.y,
  };
}
