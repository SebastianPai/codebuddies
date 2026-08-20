// Fuente única de verdad de rareza de Item. Antes existían tres copias
// hardcodeadas y mutuamente inconsistentes con esta (apps/web ItemsPage.tsx,
// apps/web ItemEditor.tsx, apps/game Shop.tsx) usando una escala de 4
// niveles (Common/Rare/Epic/Legendary, sin Uncommon). Todo consumidor nuevo
// -- backend o frontend -- debe leer esta definición (directo acá desde el
// backend, o vía GET /items/rarity-catalog desde el frontend) en vez de
// declarar su propia tabla de rareza.
export enum ItemRarity {
  COMMON = 0,
  UNCOMMON = 1,
  RARE = 2,
  EPIC = 3,
  LEGENDARY = 4,
}

export interface RarityDefinition {
  id: ItemRarity;
  // Clave estable en minúsculas -- para que frontends compongan su propia
  // key de traducción (ej. `items.rarity${capitalize(key)}`) sin depender
  // del id numérico ni de un label ya traducido acá (el backend no traduce).
  key: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  minCoins: number;
  maxCoins: number;
}

// Rangos de referencia de la auditoría de economía de items (2026-08-20).
// Son reglas de economía, no precios automáticos: la rareza la decide el
// valor artístico/de contenido del objeto, nunca el precio ni al revés.
export const RARITY_DEFINITIONS: readonly RarityDefinition[] = [
  { id: ItemRarity.COMMON, key: 'common', minCoins: 50, maxCoins: 200 },
  { id: ItemRarity.UNCOMMON, key: 'uncommon', minCoins: 250, maxCoins: 600 },
  { id: ItemRarity.RARE, key: 'rare', minCoins: 700, maxCoins: 1500 },
  { id: ItemRarity.EPIC, key: 'epic', minCoins: 1800, maxCoins: 3500 },
  { id: ItemRarity.LEGENDARY, key: 'legendary', minCoins: 4000, maxCoins: 7500 },
];

const RARITY_BY_ID = new Map<number, RarityDefinition>(
  RARITY_DEFINITIONS.map((def) => [def.id, def]),
);

export function getRarityDefinition(rarity: number): RarityDefinition {
  const def = RARITY_BY_ID.get(rarity);
  if (!def) {
    throw new Error(`Rareza desconocida: ${rarity}. Valores válidos: 0-${RARITY_DEFINITIONS.length - 1}.`);
  }
  return def;
}

export function isKnownRarity(rarity: number): boolean {
  return RARITY_BY_ID.has(rarity);
}
