// src/types/AvatarData.ts

/**
 * Slots posibles del avatar (deben coincidir exactamente con los del backend)
 */
export const AvatarSlotNames = [
  "BODY",
  "HEAD",
  "HAIR",
  "EYES",
  "SHIRT",
  "LEGS",
  "SHOES",
  "LEFT_ARM",
  "RIGHT_ARM",
  "ACCESSORY_HEAD",
  "ACCESSORY_FACE",
  "ACCESSORY_BACK",
  "ACCESSORY_LEFT",
  "ACCESSORY_RIGHT",
] as const;

export type AvatarSlotType = (typeof AvatarSlotNames)[number];

/**
 * Representa un slot equipado en el avatar
 */
export interface AvatarSlot {
  slot: AvatarSlotType; // ← más seguro que string genérico

  itemId: string | null; // ← puede ser null si el slot está vacío

  type?: string; // ← opcional, ya que no siempre se usa
  //    (el tipo real está en el Item del backend)
  color?: number | null; // ← color específico para este slot (ej: tintar una camisa)

  imageUrl?: string | null; // ← opcional y puede ser null
  //    (fallback cuando no hay sprites)
  colorable?: boolean; // ← si el slot se puede tintar (ej: BODY, HAIR)

  layer: number; // ← casi siempre existe, pero por si acaso

  offsetX?: number; // ← offsets opcionales (muy útil)
  offsetY?: number;

  sprites?: Array<{
    imageUrl: string; // ← obligatoria para sprites válidos
    frameWidth: number;
    frameHeight: number;
    framesCount: number;
    rows: number; // usualmente 4, pero mejor dejarlo explícito

    // Información de la animación asociada
    animation?: {
      name?: string; // ← muy recomendado: "idle", "walk", "run", "dance", etc.
      speed?: number; // frame rate
      loop?: boolean;
      // Si en el futuro agregas más: variant, priority, etc.
    };

    // Opcional: si usas direction en el backend
    direction?: "down" | "up" | "left" | "right" | "all";
  }>;
}

/**
 * Avatar completo del jugador
 */
export interface AvatarData {
  slots: AvatarSlot[];
  skinColor: number; // usualmente en formato 0xRRGGBB
  // Opcionales que podrías agregar después:
  // hairColor?: number;
  // eyeColor?: number;
}
