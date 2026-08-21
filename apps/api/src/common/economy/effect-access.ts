// Fuente única de verdad de qué Name Effect (ver @codebuddies/visual-effects
// en el monorepo) puede usar un usuario. Espejo del tier split definido en
// packages/visual-effects/index.ts (unlockRule: "free" | "premium" |
// "ownable") -- si se agrega/saca un efecto de un tier, actualizar ambos
// lados. apps/api no importa el paquete de tokens (frontend-flavored),
// mismo criterio que ya se usaba para SUPPORTED_CHAT_BUBBLE_THEMES.
export const FREE_NAME_EFFECTS = new Set(['common', 'uncommon', 'rare']);

// Incluidos con una suscripción Premium activa (ver PremiumAccessService).
export const PREMIUM_NAME_EFFECTS = new Set([
  'epic',
  'legendary',
  'diamond',
  'sapphire',
  'ruby',
  'emerald',
  'ice',
  'fire',
  'electric',
  'cyber',
]);

// No vienen con Premium -- requieren un UserItem para el Item real
// (type: EFFECT, effectKey: este id) que los representa. Se compran en la
// tienda, se regalan (ItemsService.giftItem), o se otorgan como recompensa
// de Battle Pass (BattlePassTier.itemId).
export const OWNABLE_NAME_EFFECTS = new Set([
  'rainbow',
  'mythic',
  'divine',
  'galaxy',
  'aurora',
  'holographic',
  'obsidian',
  'matrix',
  'crystal',
]);

// Todo id válido, sin importar el tier -- para validación de DTO (@IsIn).
export const SUPPORTED_NAME_EFFECTS = [
  ...FREE_NAME_EFFECTS,
  ...PREMIUM_NAME_EFFECTS,
  ...OWNABLE_NAME_EFFECTS,
] as const;
