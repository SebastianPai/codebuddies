// Documentación viva de la taxonomía de `Item.category`, producida por la
// auditoría de economía de items (2026-08-20). NO se aplica todavía: sigue
// siendo un campo String libre en el schema, sin enum ni migración de
// datos. Esto es a propósito -- ver el audit: el Shop real (apps/game)
// nunca filtró por `category`, filtra por `type` + `worldData.kind`, así
// que `category` quedó como texto libre sin ninguna presión real de
// consistencia. Antes de convertirla en un enum forzado hace falta migrar
// los 18 valores existentes uno por uno (con revisión humana, no automática
// -- varios ya están mal cargados, ej. "furniture" en items de AVATAR).
//
// PROPOSED_SHOP_CATEGORIES es la taxonomía candidata para cuando se decida
// hacer esa migración. No se usa en ningún flujo de validación todavía.
export const PROPOSED_SHOP_CATEGORIES = [
  'AVATAR',
  'CLOTHING',
  'ACCESSORY',
  'FURNITURE',
  'FLOOR',
  'WALL',
  'DECORATION',
  'BACKGROUND',
  'SPECIAL',
] as const;

export type ProposedShopCategory = (typeof PROPOSED_SHOP_CATEGORIES)[number];

// Mapping documentado de los valores libres reales encontrados en la base
// (auditoría 2026-08-20, 18 filas de Item) hacia la taxonomía propuesta.
// Puramente informativo -- ningún código lee esto para transformar datos.
export const CURRENT_CATEGORY_VALUES_OBSERVED: ReadonlyArray<{
  currentValue: string;
  count: number;
  proposedCategory: ProposedShopCategory;
  note?: string;
}> = [
  { currentValue: 'DECORATION', count: 4, proposedCategory: 'FURNITURE' },
  { currentValue: '', count: 3, proposedCategory: 'SPECIAL', note: 'vacío -- requiere revisión item por item' },
  { currentValue: 'textura', count: 3, proposedCategory: 'FLOOR' },
  { currentValue: 'texturas', count: 2, proposedCategory: 'FLOOR' },
  { currentValue: 'furniture', count: 2, proposedCategory: 'FURNITURE', note: '1 de las 2 filas es en realidad un item de AVATAR mal categorizado ("saco")' },
  { currentValue: 'ropa', count: 1, proposedCategory: 'CLOTHING' },
  { currentValue: 'pelo', count: 1, proposedCategory: 'ACCESSORY' },
  { currentValue: 'camiseta', count: 1, proposedCategory: 'CLOTHING' },
  { currentValue: 'pasto', count: 1, proposedCategory: 'FLOOR' },
];
