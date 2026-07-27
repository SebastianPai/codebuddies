export interface ParsedSlot {
  slot: string;
  itemId: string | null;
  imageUrl?: string | null;
  layer?: number;
  color?: number | null;
  colorable?: boolean;
  sprites: Array<{
    imageUrl: string;
    frameWidth: number;
    frameHeight: number;
    framesCount: number;
    rows: number;
    animation: {
      speed: number;
      loop: boolean;
    };
  }>;
}

export interface ParsedAvatar {
  slots: ParsedSlot[];
  skinColor: number;
}

// ====================== DTOs para requests ======================

export interface EquipItemDto {
  slot: string;
  itemId: string;
  color?: number | null;
}

export interface UpdateAvatarDto {
  skinColor?: number;
  slots?: Array<{
    slot: string;
    itemId: string;
    color?: number | null;
  }>;
}

export interface AvatarResponse {
  avatar: ParsedAvatar;
  playerId?: string;
}
