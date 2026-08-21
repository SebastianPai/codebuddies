/**
 * Centralized "premium visual effects" design tokens.
 *
 * Single source of truth for every rarity / rank / seasonal text-and-border
 * treatment used across apps/web and apps/game. Consumers only ever look up
 * a class name here and apply it — no gradient stops, colors, or animation
 * names are hardcoded anywhere else in either app.
 *
 * Adding a new future effect = add one entry here + its two CSS classes in
 * effects.css. No existing component needs to change.
 */

export type EffectId =
  // item/badge rarity tiers
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  // leaderboard podium ranks
  | "goldRank"
  | "silverRank"
  | "bronzeRank"
  // extended / seasonal set
  | "rainbow"
  | "diamond"
  | "mythic"
  | "divine"
  | "galaxy"
  | "aurora"
  | "ice"
  | "fire"
  | "emerald"
  | "ruby"
  | "sapphire"
  | "holographic"
  | "obsidian"
  | "cyber"
  | "matrix"
  | "electric"
  | "crystal";

export type EffectUsage =
  | "itemRarity"
  | "badgeRarity"
  | "nameEffect"
  | "rankPodium";

// Los tres niveles de acceso a un Name Effect (ver plan de entitlements):
// - "free": todos, siempre.
// - "premium": incluido con una suscripción Premium activa (10 efectos).
// - "ownable": no viene con Premium -- se compra en la tienda con coins, se
//   puede regalar (ItemsService.giftItem) u obtener como recompensa de
//   Battle Pass. Requiere un Item real (type: EFFECT, effectKey: este id).
// En los tres casos, un usuario ADMIN tiene todo desbloqueado sin excepción
// (ver IdentityService#getUnlockedEffectIds en apps/api).
export interface VisualEffectDefinition {
  id: EffectId;
  label: string;
  usage: EffectUsage[];
  unlockRule: "free" | "premium" | "ownable";
  /** Gradient-clip text treatment class (always present). */
  textClassName: string;
  /** Card/row border+glow treatment class. Starts at "rare" — common/uncommon have none. */
  borderClassName?: string;
  /** Static (non-animated) glow class, opt-in, pairs with borderClassName. */
  glowClassName?: string;
  /** Hex stops, in visual order. Used only to build picker swatch previews — never injected at runtime. */
  gradientStops: string[];
  /** Representative hex for UI chrome (lock icons, swatch rings) that isn't itself gradient-capable. */
  glowColor: string;
  /** Omitted = static gradient, no motion (common/uncommon). */
  animationName?: "cb-fx-shimmer-sweep" | "cb-fx-holo-sweep";
  reducedMotionFallback: "static-gradient" | "solid";
}

const ALL_DISPLAY_USAGE: EffectUsage[] = ["itemRarity", "badgeRarity", "nameEffect"];

export const VISUAL_EFFECTS: Record<EffectId, VisualEffectDefinition> = {
  common: {
    id: "common",
    label: "Common",
    usage: ALL_DISPLAY_USAGE,
    unlockRule: "free",
    textClassName: "cb-fx-text-common",
    gradientStops: ["#8a8f98"],
    glowColor: "#8a8f98",
    reducedMotionFallback: "solid",
  },
  uncommon: {
    id: "uncommon",
    label: "Uncommon",
    usage: ALL_DISPLAY_USAGE,
    unlockRule: "free",
    textClassName: "cb-fx-text-uncommon",
    gradientStops: ["#7cc576", "#4f9c5a"],
    glowColor: "#5fae66",
    reducedMotionFallback: "static-gradient",
  },
  rare: {
    id: "rare",
    label: "Rare",
    usage: ALL_DISPLAY_USAGE,
    unlockRule: "free",
    textClassName: "cb-fx-text-rare",
    borderClassName: "cb-fx-border-rare",
    glowClassName: "cb-fx-glow-rare",
    gradientStops: ["#5b9bd5", "#3a6ea5"],
    glowColor: "#4a86c2",
    reducedMotionFallback: "static-gradient",
  },
  epic: {
    id: "epic",
    label: "Epic",
    usage: ALL_DISPLAY_USAGE,
    unlockRule: "premium",
    textClassName: "cb-fx-text-epic",
    borderClassName: "cb-fx-border-epic",
    glowClassName: "cb-fx-glow-epic",
    gradientStops: ["#a78bfa", "#7c5cff", "#a78bfa"],
    glowColor: "#8b6df0",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  legendary: {
    id: "legendary",
    label: "Legendary",
    usage: ALL_DISPLAY_USAGE,
    unlockRule: "premium",
    textClassName: "cb-fx-text-legendary",
    borderClassName: "cb-fx-border-legendary",
    glowClassName: "cb-fx-glow-legendary",
    gradientStops: ["#ff8a00", "#ffd23f", "#ff8a00"],
    glowColor: "#ffb02e",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },

  goldRank: {
    id: "goldRank",
    label: "Gold",
    usage: ["rankPodium"],
    unlockRule: "free",
    textClassName: "cb-fx-text-goldRank",
    borderClassName: "cb-fx-border-goldRank",
    glowClassName: "cb-fx-glow-goldRank",
    gradientStops: ["#92702c", "#f9e28c", "#fff8dc", "#d4af37", "#fff8dc", "#f9e28c", "#92702c"],
    glowColor: "#d4af37",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  silverRank: {
    id: "silverRank",
    label: "Silver",
    usage: ["rankPodium"],
    unlockRule: "free",
    textClassName: "cb-fx-text-silverRank",
    borderClassName: "cb-fx-border-silverRank",
    glowClassName: "cb-fx-glow-silverRank",
    gradientStops: ["#75808c", "#e4e9ee", "#ffffff", "#c2cad3", "#ffffff", "#e4e9ee", "#75808c"],
    glowColor: "#c2cad3",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  bronzeRank: {
    id: "bronzeRank",
    label: "Bronze",
    usage: ["rankPodium"],
    unlockRule: "free",
    textClassName: "cb-fx-text-bronzeRank",
    borderClassName: "cb-fx-border-bronzeRank",
    glowClassName: "cb-fx-glow-bronzeRank",
    gradientStops: ["#7a4a28", "#d59a6a", "#f0c797", "#b06f3f", "#f0c797", "#d59a6a", "#7a4a28"],
    glowColor: "#b06f3f",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },

  rainbow: {
    id: "rainbow",
    label: "Rainbow",
    usage: ["nameEffect", "badgeRarity"],
    unlockRule: "ownable",
    textClassName: "cb-fx-text-rainbow",
    borderClassName: "cb-fx-border-rainbow",
    glowClassName: "cb-fx-glow-rainbow",
    gradientStops: ["#ff004c", "#ff9900", "#fbef19", "#22e07a", "#21b2ff", "#a259ff", "#ff004c"],
    glowColor: "#a259ff",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  diamond: {
    id: "diamond",
    label: "Diamond",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "premium",
    textClassName: "cb-fx-text-diamond",
    borderClassName: "cb-fx-border-diamond",
    glowClassName: "cb-fx-glow-diamond",
    gradientStops: ["#e0f7ff", "#ffffff", "#b8e6ff", "#ffffff", "#e0f7ff"],
    glowColor: "#bfeaff",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  mythic: {
    id: "mythic",
    label: "Mythic",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "ownable",
    textClassName: "cb-fx-text-mythic",
    borderClassName: "cb-fx-border-mythic",
    glowClassName: "cb-fx-glow-mythic",
    gradientStops: ["#ff5cad", "#7b2ff7", "#ff5cad"],
    glowColor: "#c04ce0",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  divine: {
    id: "divine",
    label: "Divine",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "ownable",
    textClassName: "cb-fx-text-divine",
    borderClassName: "cb-fx-border-divine",
    glowClassName: "cb-fx-glow-divine",
    gradientStops: ["#fff8e1", "#ffd700", "#fff8e1"],
    glowColor: "#f2d675",
    animationName: "cb-fx-holo-sweep",
    reducedMotionFallback: "static-gradient",
  },
  galaxy: {
    id: "galaxy",
    label: "Galaxy",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "ownable",
    textClassName: "cb-fx-text-galaxy",
    borderClassName: "cb-fx-border-galaxy",
    glowClassName: "cb-fx-glow-galaxy",
    gradientStops: ["#241a45", "#6a3fd6", "#a37bff", "#241a45"],
    glowColor: "#6a3fd6",
    animationName: "cb-fx-holo-sweep",
    reducedMotionFallback: "static-gradient",
  },
  aurora: {
    id: "aurora",
    label: "Aurora",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "ownable",
    textClassName: "cb-fx-text-aurora",
    borderClassName: "cb-fx-border-aurora",
    glowClassName: "cb-fx-glow-aurora",
    gradientStops: ["#4dd8b0", "#7c9eff", "#c98bff", "#4dd8b0"],
    glowColor: "#7c9eff",
    animationName: "cb-fx-holo-sweep",
    reducedMotionFallback: "static-gradient",
  },
  ice: {
    id: "ice",
    label: "Ice",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "premium",
    textClassName: "cb-fx-text-ice",
    borderClassName: "cb-fx-border-ice",
    glowClassName: "cb-fx-glow-ice",
    gradientStops: ["#cdeeff", "#eaffff", "#a9d8ff"],
    glowColor: "#bfe7ff",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  fire: {
    id: "fire",
    label: "Fire",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "premium",
    textClassName: "cb-fx-text-fire",
    borderClassName: "cb-fx-border-fire",
    glowClassName: "cb-fx-glow-fire",
    gradientStops: ["#e2542f", "#f2a33d", "#e2542f"],
    glowColor: "#e2782f",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  emerald: {
    id: "emerald",
    label: "Emerald",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "premium",
    textClassName: "cb-fx-text-emerald",
    borderClassName: "cb-fx-border-emerald",
    glowClassName: "cb-fx-glow-emerald",
    gradientStops: ["#0f9d63", "#6be3a5", "#0f9d63"],
    glowColor: "#2bb87e",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  ruby: {
    id: "ruby",
    label: "Ruby",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "premium",
    textClassName: "cb-fx-text-ruby",
    borderClassName: "cb-fx-border-ruby",
    glowClassName: "cb-fx-glow-ruby",
    gradientStops: ["#a3213e", "#ff6f91", "#a3213e"],
    glowColor: "#c93b5c",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  sapphire: {
    id: "sapphire",
    label: "Sapphire",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "premium",
    textClassName: "cb-fx-text-sapphire",
    borderClassName: "cb-fx-border-sapphire",
    glowClassName: "cb-fx-glow-sapphire",
    gradientStops: ["#1e3a8a", "#60a5fa", "#1e3a8a"],
    glowColor: "#3f6fc4",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  holographic: {
    id: "holographic",
    label: "Holographic",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "ownable",
    textClassName: "cb-fx-text-holographic",
    borderClassName: "cb-fx-border-holographic",
    glowClassName: "cb-fx-glow-holographic",
    gradientStops: ["#ff9ecb", "#a0e7ff", "#d1ff9e", "#ffe89e", "#d1a0ff", "#ff9ecb"],
    glowColor: "#c9a0ff",
    animationName: "cb-fx-holo-sweep",
    reducedMotionFallback: "static-gradient",
  },
  obsidian: {
    id: "obsidian",
    label: "Obsidian",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "ownable",
    textClassName: "cb-fx-text-obsidian",
    borderClassName: "cb-fx-border-obsidian",
    glowClassName: "cb-fx-glow-obsidian",
    gradientStops: ["#0d0d12", "#3a2a52", "#0d0d12"],
    glowColor: "#4a3670",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  cyber: {
    id: "cyber",
    label: "Cyber",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "premium",
    textClassName: "cb-fx-text-cyber",
    borderClassName: "cb-fx-border-cyber",
    glowClassName: "cb-fx-glow-cyber",
    gradientStops: ["#4fd8c4", "#b06bff", "#4fd8c4"],
    glowColor: "#7fb8e0",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  matrix: {
    id: "matrix",
    label: "Matrix",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "ownable",
    textClassName: "cb-fx-text-matrix",
    borderClassName: "cb-fx-border-matrix",
    glowClassName: "cb-fx-glow-matrix",
    gradientStops: ["#0d2b1a", "#3ddc84", "#0d2b1a"],
    glowColor: "#2fb86e",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  electric: {
    id: "electric",
    label: "Electric",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "premium",
    textClassName: "cb-fx-text-electric",
    borderClassName: "cb-fx-border-electric",
    glowClassName: "cb-fx-glow-electric",
    gradientStops: ["#7df9ff", "#2596ff", "#7df9ff"],
    glowColor: "#4fb8ff",
    animationName: "cb-fx-shimmer-sweep",
    reducedMotionFallback: "static-gradient",
  },
  crystal: {
    id: "crystal",
    label: "Crystal",
    usage: ["nameEffect", "itemRarity"],
    unlockRule: "ownable",
    textClassName: "cb-fx-text-crystal",
    borderClassName: "cb-fx-border-crystal",
    glowClassName: "cb-fx-glow-crystal",
    gradientStops: ["#f5e9ff", "#d7c3ff", "#f5e9ff"],
    glowColor: "#d7c3ff",
    animationName: "cb-fx-holo-sweep",
    reducedMotionFallback: "static-gradient",
  },
};

const EFFECT_IDS = Object.keys(VISUAL_EFFECTS) as EffectId[];

/** Item.rarity is a bare Int 0-4 (ItemRarity enum in apps/api). */
export function resolveItemRarityEffect(rarity: number): VisualEffectDefinition {
  switch (rarity) {
    case 0:
      return VISUAL_EFFECTS.common;
    case 1:
      return VISUAL_EFFECTS.uncommon;
    case 2:
      return VISUAL_EFFECTS.rare;
    case 3:
      return VISUAL_EFFECTS.epic;
    case 4:
      return VISUAL_EFFECTS.legendary;
    default:
      return VISUAL_EFFECTS.common;
  }
}

const LOOSE_RARITY_MAP: Record<string, EffectId> = {
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
  EPIC: "epic",
  LEGENDARY: "legendary",
  BRONZE: "bronzeRank",
  SILVER: "silverRank",
  GOLD: "goldRank",
};

/** GamificationBadge/Title/Pet.rarity is loose free-text — case-insensitive, graceful fallback. */
export function resolveLooseRarityEffect(rarity: string | null | undefined): VisualEffectDefinition {
  if (!rarity) return VISUAL_EFFECTS.common;
  const id = LOOSE_RARITY_MAP[rarity.trim().toUpperCase()];
  return id ? VISUAL_EFFECTS[id] : VISUAL_EFFECTS.common;
}

/** 1-based leaderboard rank -> podium effect, or null for rank > 3 (render as plain). */
export function resolvePodiumEffect(rank: number): VisualEffectDefinition | null {
  if (rank === 1) return VISUAL_EFFECTS.goldRank;
  if (rank === 2) return VISUAL_EFFECTS.silverRank;
  if (rank === 3) return VISUAL_EFFECTS.bronzeRank;
  return null;
}

/** Effects eligible for the Premium "Name Effect" picker (all tiers — free/premium/ownable). */
export function getNameEffectCatalog(): VisualEffectDefinition[] {
  return EFFECT_IDS.map((id) => VISUAL_EFFECTS[id]).filter((effect) =>
    effect.usage.includes("nameEffect"),
  );
}

/**
 * Effects sold individually as shop items (not included with Premium) — one
 * real Item per id (type: EFFECT, effectKey: id), seeded by
 * apps/api/prisma/seed-effect-items.ts. Used by the admin ItemEditor's
 * effectKey dropdown and by the Shop's "Effects" tab.
 */
export function getOwnableEffectIds(): EffectId[] {
  return EFFECT_IDS.filter((id) => VISUAL_EFFECTS[id].unlockRule === "ownable");
}

/** Safe lookup with fallback to "common" (i.e. no visible effect) for null/unknown ids. */
// Sin id (usuario no eligió Name Effect) es un caso distinto de "rareza
// Common" explícita: no debe pisar el color que ya traiga el contenedor
// (ej. un username dorado por diseño) con el gris neutro de VISUAL_EFFECTS.common.
// Por eso el fallback "sin id" no trae textClassName/borderClassName —
// noop real — mientras que pasar el string "common" explícito sí devuelve
// el estilo gris intencional (ítem de rareza Common, etc.).
const NO_EFFECT: VisualEffectDefinition = {
  id: "common",
  label: "Default",
  usage: [],
  unlockRule: "free",
  textClassName: "",
  gradientStops: ["#8a8f98"],
  glowColor: "#8a8f98",
  reducedMotionFallback: "solid",
};

export function getEffectDefinition(id: string | null | undefined): VisualEffectDefinition {
  if (!id) return NO_EFFECT;
  if (id in VISUAL_EFFECTS) return VISUAL_EFFECTS[id as EffectId];
  return NO_EFFECT;
}
