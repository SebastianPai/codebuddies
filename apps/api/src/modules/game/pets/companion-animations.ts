// Normaliza la config de animaciones de mascotas / NPC. Compartido por
// PetSpeciesService y NpcService. Un "clip" es una animación con nombre
// (walk, idle, sit, sleep...) que ocupa `directions` filas consecutivas del
// spritesheet a partir de `row`, con `framesCount` columnas.

export const COMPANION_DIRECTIONS = [1, 2, 4, 8] as const;
export type CompanionDirections = (typeof COMPANION_DIRECTIONS)[number];

// Orden ESTÁNDAR de las filas del spritesheet -> dirección isométrica.
// Todas las mascotas/NPC siguen este orden (fila 0 = South, fila 1 = North,
// ...). El juego mapea el ángulo de movimiento contra esta lista.
// Con `directions` < 8 se usan solo las primeras N entradas.
export const COMPANION_DIRECTION_ORDER = [
  'S', // 0
  'N', // 1
  'SE', // 2
  'NW', // 3
  'E', // 4
  'W', // 5
  'NE', // 6
  'SW', // 7
] as const;

export function normalizeDirections(value: unknown): CompanionDirections {
  const n = Math.trunc(Number(value));
  return (COMPANION_DIRECTIONS as readonly number[]).includes(n)
    ? (n as CompanionDirections)
    : 4;
}

// Qué estado del juego dispara el clip.
export const CLIP_TRIGGERS = [
  'MOVING', // mientras camina (sigue al dueño)
  'IDLE', // quieta, parada
  'SIT', // sentada (dueño se sentó, o se sienta sola tras mucho idle)
  'SLEEP', // dormida (mucho idle / dueño dormido / energía baja)
  'EAT', // al alimentarla
  'RANDOM', // gesto ocasional durante IDLE
] as const;
export type ClipTrigger = (typeof CLIP_TRIGGERS)[number];

export interface AnimClip {
  key: string;
  trigger: ClipTrigger;
  row: number; // primera fila del bloque (ocupa `directions` filas)
  startCol: number; // primera columna de esta animación dentro de la fila
  framesCount: number;
  fps: number;
  loop: boolean;
  spriteSheetUrl: string | null;
  frameWidth: number | null;
  frameHeight: number | null;
}

const posInt = (v: unknown, fallback: number, max = 4096) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};
const nonNegInt = (v: unknown, fallback = 0) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 4096) : fallback;
};

function normalizeClip(raw: unknown): AnimClip | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const key = String(r.key ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 24);
  if (!key) return null;

  const trigger = (CLIP_TRIGGERS as readonly string[]).includes(
    String(r.trigger),
  )
    ? (r.trigger as ClipTrigger)
    : 'IDLE';

  return {
    key,
    trigger,
    row: nonNegInt(r.row, 0),
    startCol: nonNegInt(r.startCol, 0),
    framesCount: posInt(r.framesCount, 1, 128),
    fps: posInt(r.fps, 6, 60),
    loop: r.loop === undefined ? trigger !== 'EAT' : Boolean(r.loop),
    spriteSheetUrl:
      typeof r.spriteSheetUrl === 'string' && r.spriteSheetUrl
        ? r.spriteSheetUrl
        : null,
    frameWidth:
      r.frameWidth == null || r.frameWidth === ''
        ? null
        : posInt(r.frameWidth, 32),
    frameHeight:
      r.frameHeight == null || r.frameHeight === ''
        ? null
        : posInt(r.frameHeight, 32),
  };
}

export function normalizeAnimations(raw: unknown): AnimClip[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeClip)
    .filter((c): c is AnimClip => c !== null)
    .slice(0, 24);
}
