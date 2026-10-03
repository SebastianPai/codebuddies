// Cómo se ve cada empleado de CodeStudio.
//
// - Por piezas, como un jugador: cuerpo, pelo, ropa... sacados de los items
//   de avatar marcados como "ropa de empleados" (tag employee:wear) en el
//   admin; donde no haya, el item por defecto de ese slot. Tono de piel y
//   color de pelo al azar, siempre los mismos para esa persona.
// - O con una skin completa (NPC tipo EMPLOYEE del admin).
// Nunca con la del mayordomo: son cosas distintas.

export const EMPLOYEE_WEAR_TAG = 'employee:wear';

export const AVATAR_SLOTS = [
  'BODY',
  'HEAD',
  'HAIR',
  'EYES',
  'SHIRT',
  'LEGS',
  'SHOES',
  'LEFT_ARM',
  'RIGHT_ARM',
  'ACCESSORY_HEAD',
  'ACCESSORY_FACE',
  'ACCESSORY_BACK',
  'ACCESSORY_LEFT',
  'ACCESSORY_RIGHT',
] as const;

const SKIN_TONES = [0xffe0bd, 0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524];
// Pelo natural para casi todos; solo la personalidad "alegre" (~1 de cada
// 8) se anima con colores de fantasía.
const HAIR_COLORS = [0x2b1b0e, 0x4a2c17, 0x8b5a2b, 0xd4a24c, 0x1a1a1a, 0xa83232, 0x7a7a7a];
const FUN_HAIR_COLORS = [0x3fbf7f, 0xff6fae, 0x4f8cff, 0x9b5cff, 0xff8a3d];
const CHEERFUL_CHANCE = 8; // 1 de cada 8

// Paletas que combinan, por estilo: arriba, abajo y zapatos salen de la
// misma paleta (nada de pelo verde + camisa azul + pantalón rosado... salvo
// la gente alegre).
const PALETTES: Record<string, { top: number[]; bottom: number[]; shoes: number[] }> = {
  casual: { top: [0xffffff, 0x9fb7d4, 0xd9c7a7, 0x7a8b5a, 0xb0b0b0], bottom: [0x3b5b8c, 0x2f3e57, 0xc9b38f], shoes: [0xffffff, 0x5a3d2b, 0x2b2b2b] },
  elegant: { top: [0xffffff, 0x1f2a44, 0x2b2b2b, 0x6b1f2a], bottom: [0x1f2a44, 0x2b2b2b, 0x3a3a3a], shoes: [0x1a1a1a, 0x4a2c17] },
  sport: { top: [0xe63946, 0x1d70b8, 0xffffff, 0x2b2b2b], bottom: [0x2b2b2b, 0x1f2a44, 0x9a9a9a], shoes: [0xffffff, 0x2b2b2b] },
  urban: { top: [0x2b2b2b, 0x5b6b3a, 0xc9a227, 0x8a8a8a], bottom: [0x2b2b2b, 0x3a3f33, 0x5a5a5a], shoes: [0x1a1a1a, 0xffffff] },
  cheerful: { top: [0xffd23f, 0xff6fae, 0x3fbf7f, 0x4f8cff], bottom: [0xffffff, 0x2f3e57, 0x9b5cff], shoes: [0xff8a3d, 0xffffff] },
};

/** Personalidad visual: "alegre" se viste y peina con color; el resto, sobrio. */
export function isCheerful(employeeId: string) {
  return hash(`${employeeId}:cheerful`) % CHEERFUL_CHANCE === 0;
}

export const WEAR_STYLES = ['casual', 'elegant', 'sport', 'urban'] as const;
export type WearStyle = (typeof WEAR_STYLES)[number];

export type WardrobeItem = {
  id: string;
  tags: string[];
  slot: string;
  imageUrl: string | null;
  layer: number;
  colorable: boolean;
  isDefault: boolean;
  wear: boolean;
  sprites: Array<{ imageUrl: string | null; frameWidth: number; frameHeight: number; framesCount: number; animation: { speed: number | null; loop: boolean | null } | null }>;
};

export type EmployeeAvatar = {
  skinColor: number;
  slots: Array<{
    slot: string;
    itemId: string | null;
    imageUrl: string | null;
    layer: number;
    color: number | null;
    colorable: boolean;
    sprites: Array<{ imageUrl: string; frameWidth: number; frameHeight: number; framesCount: number; rows: number; animation: { speed: number; loop: boolean } }>;
  }>;
};

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Hay ropa marcada para empleados (además de los items por defecto). */
export function hasEmployeeWardrobe(wardrobe: WardrobeItem[]) {
  return wardrobe.some((item) => item.wear);
}

function genderOfItem(item: WardrobeItem): 'MALE' | 'FEMALE' | null {
  if (item.tags.includes('gender:female')) return 'FEMALE';
  if (item.tags.includes('gender:male')) return 'MALE';
  return null;
}

function styleOfItem(item: WardrobeItem): WearStyle | null {
  return WEAR_STYLES.find((style) => item.tags.includes(`style:${style}`)) ?? null;
}

/**
 * Estilo de un empleado (casual, elegante...): siempre el mismo para la
 * misma persona, elegido entre los estilos que hay en la ropa marcada.
 */
export function employeeStyle(employeeId: string, wardrobe: WardrobeItem[], gender: 'MALE' | 'FEMALE'): WearStyle | null {
  const available = WEAR_STYLES.filter((style) =>
    wardrobe.some((item) => item.wear && styleOfItem(item) === style && (genderOfItem(item) ?? gender) === gender),
  );
  if (available.length === 0) return null;
  return available[hash(`${employeeId}:style`) % available.length];
}

/**
 * Avatar por piezas de un empleado: siempre el mismo para la misma persona.
 * Solo usa ropa de su género (o unisex) y, si tiene estilo, prefiere esa.
 */
export function employeeAvatar(employeeId: string, wardrobe: WardrobeItem[], gender: 'MALE' | 'FEMALE' = 'MALE'): EmployeeAvatar | null {
  const style = employeeStyle(employeeId, wardrobe, gender);
  const fits = (item: WardrobeItem) => (genderOfItem(item) ?? gender) === gender;
  const slots = AVATAR_SLOTS.map((slot) => {
    const worn = wardrobe.filter((item) => item.slot === slot && item.wear && fits(item));
    const styled = style ? worn.filter((item) => styleOfItem(item) === style) : [];
    const plain = worn.filter((item) => !styleOfItem(item));
    // Su estilo primero; si no hay de ese estilo en este slot, algo neutro; si no, cualquiera que le quede.
    const pool = styled.length > 0 ? styled : plain.length > 0 ? plain : worn;
    const fallback = wardrobe.find((item) => item.slot === slot && item.isDefault && fits(item)) ?? wardrobe.find((item) => item.slot === slot && item.isDefault) ?? null;
    const item = pool.length > 0 ? pool[hash(`${employeeId}:${slot}`) % pool.length] : fallback;
    const cheerful = isCheerful(employeeId);
    const hairPalette = cheerful ? FUN_HAIR_COLORS : HAIR_COLORS;
    const palette = PALETTES[cheerful ? 'cheerful' : (style ?? 'casual')];
    const pickColor = (colors: number[], part: string) => colors[hash(`${employeeId}:${part}`) % colors.length];
    const colorFor: Record<string, number> = {
      HAIR: pickColor(hairPalette, 'hair'),
      SHIRT: pickColor(palette.top, 'top'),
      LEGS: pickColor(palette.bottom, 'bottom'),
      SHOES: pickColor(palette.shoes, 'shoes'),
    };
    return {
      slot,
      itemId: item?.id ?? null,
      imageUrl: item?.imageUrl ?? null,
      layer: item?.layer ?? 0,
      // Solo se tiñe lo que se puede teñir (el cuerpo usa el tono de piel).
      color: item && item.colorable && colorFor[slot] !== undefined ? colorFor[slot] : null,
      colorable: item?.colorable ?? false,
      sprites: (item?.sprites ?? [])
        .filter((sprite) => sprite.imageUrl)
        .map((sprite) => ({
          imageUrl: sprite.imageUrl!,
          frameWidth: Number(sprite.frameWidth) || 32,
          frameHeight: Number(sprite.frameHeight) || 32,
          framesCount: Number(sprite.framesCount) || 16,
          rows: 4,
          animation: { speed: Number(sprite.animation?.speed) || 6, loop: sprite.animation?.loop ?? true },
        })),
    };
  });
  // Sin cuerpo no hay a quién vestir.
  if (!slots.some((slot) => slot.slot === 'BODY' && slot.imageUrl)) return null;
  return { skinColor: SKIN_TONES[hash(`${employeeId}:skin`) % SKIN_TONES.length], slots };
}

/**
 * Elige el look: con skins completas y ropa a la vez, mitad y mitad (fijo
 * por persona); con solo una de las dos, esa; sin nada, por piezas con lo
 * que haya por defecto.
 */
export function prefersSkin(employeeId: string, hasSkins: boolean, wardrobe: WardrobeItem[]) {
  if (!hasSkins) return false;
  if (!hasEmployeeWardrobe(wardrobe)) return true;
  return hash(`${employeeId}:look`) % 2 === 0;
}
