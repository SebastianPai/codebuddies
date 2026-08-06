// apps/game/src/game/types/AvatarTypes.ts
export interface GameAvatarSlot {
  slot: string; // BODY, HEAD, HAIR, etc.
  itemId: string;
  type: string; // igual que slot o ItemType
  imageUrl: string;
  layer: number;
}

export interface PlayerAvatar {
  skinColor: number;
  BODY: GameAvatarSlot;
  HEAD: GameAvatarSlot;
  HAIR: GameAvatarSlot;
  EYES: GameAvatarSlot;
  SHIRT: GameAvatarSlot;
  LEGS: GameAvatarSlot;
  SHOES: GameAvatarSlot;
  LEFT_ARM: GameAvatarSlot;
  RIGHT_ARM: GameAvatarSlot;
  ACCESSORY_HEAD: GameAvatarSlot;
  ACCESSORY_FACE: GameAvatarSlot;
  ACCESSORY_BACK: GameAvatarSlot;
  ACCESSORY_LEFT: GameAvatarSlot;
  ACCESSORY_RIGHT: GameAvatarSlot;
  slotsArray: GameAvatarSlot[];
}

// En avatar.service.ts o en un types/avatar.ts
export type DbAvatar = {
  id: string;
  userId: string;
  skinColor: number;
  hairColor?: number | null;
  eyeColor?: number | null;
  slots: Array<{
    id: string;
    slot: string;
    itemId?: string | null;
    item?: {
      id: string;
      type: string;
      imageUrl?: string | null;
      layer: number;
      sprites: Array<{
        id: string;
        imageUrl: string;
        frameWidth: number;
        frameHeight: number;
        framesCount: number;
        row: number;
        direction: string;
        animation: {
          id: string;
          name: string;
          type: string;
          variant: string;
          loop: boolean;
          speed: number;
        };
      }>;
    } | null;
  }>;
  // ...
};
