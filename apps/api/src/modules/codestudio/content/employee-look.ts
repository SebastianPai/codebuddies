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
const HAIR_COLORS = [0x2b1b0e, 0x4a2c17, 0x8b5a2b, 0xd4a24c, 0x1a1a1a, 0xa83232, 0x7a7a7a];

export type WardrobeItem = {
  id: string;
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

/** Avatar por piezas de un empleado: siempre el mismo para la misma persona. */
export function employeeAvatar(employeeId: string, wardrobe: WardrobeItem[]): EmployeeAvatar | null {
  const slots = AVATAR_SLOTS.map((slot) => {
    const worn = wardrobe.filter((item) => item.slot === slot && item.wear);
    const fallback = wardrobe.find((item) => item.slot === slot && item.isDefault) ?? null;
    const item = worn.length > 0 ? worn[hash(`${employeeId}:${slot}`) % worn.length] : fallback;
    const hairColor = HAIR_COLORS[hash(`${employeeId}:hair`) % HAIR_COLORS.length];
    return {
      slot,
      itemId: item?.id ?? null,
      imageUrl: item?.imageUrl ?? null,
      layer: item?.layer ?? 0,
      color: item && slot === 'HAIR' && item.colorable ? hairColor : null,
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
