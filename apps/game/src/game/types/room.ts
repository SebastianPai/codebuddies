export interface Room {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  isVipOnly: boolean;
  maxUsers: number;
  width: number;
  height: number;
  thumbnailUrl?: string;
  rating: number;
  totalVotes: number;
  createdAt: string;
  owner: {
    id: string;
    username: string;
    nameEffectId?: string | null;
  };
  background?: {
    id: string;
    name: string;
    imageUrl: string;
    previewUrl?: string;
    thumbnailUrl?: string;
    accessType?: Background["accessType"];
    metadata?: Background["metadata"];
  };
  _count?: {
    users: number;
    ratings?: number;
  };
}

export interface Background {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  accessType: "FREE" | "PURCHASABLE" | "PREMIUM" | "EVENT";
  coinsPrice?: number;
  gemsPrice?: number;
  canUse?: boolean;
  owned?: boolean;
  lockedReason?: string | null;
  category?: { id: string; name: string } | null;
  metadata?: {
    anchor?: {
      x?: number;
      y?: number;
      scaleMode?: "cover" | "contain" | "height";
    };
    compatibleLayoutIds?: string[];
  } | null;
}

export interface RoomLayout {
  id: string;
  name: string;
  layoutJson: any;
  thumbnail?: string;
}

export interface CreateRoomData {
  name: string;
  description?: string;
  isPublic: boolean;
  isVipOnly: boolean;
  maxUsers: number;
  width: number;
  height: number;
  backgroundId?: string;
  layoutId?: string;
}
