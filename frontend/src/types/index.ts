// src/types/index.ts
export interface BorderProperties {
  animation?: "rainbow" | "snake" | "sparkle";
  color?: string;
  speed?: number;
  intensity?: number;
}

export interface Border {
  id: string;
  name: string;
  description: string;
  properties?: BorderProperties;
  image: string;
  acquiredAt?: string;
}

export interface Achievement {
  id?: string;
  name: string;
  description: string;
  icon: string;
  image?: string;
  awardedAt?: string;
}

export interface Tag {
  tagId: string;
  name: string;
  description: string;
  properties?: { [key: string]: any };
  image: string;
  acquiredAt?: string;
}

export interface Power {
  powerId: string;
  name: string;
  description: string;
  price: number;
  effect: {
    type: string;
    value: number | string;
    duration: number;
    durationType: string;
  };
  image: string;
  emoji: string;
  usesLeft?: number;
  acquiredAt?: string;
}

export interface ActivePower {
  powerId: string;
  name: string;
  description: string;
  price: number;
  effect: {
    type: string;
    value: number | string;
    duration: number;
    durationType: string;
  };
  image: string;
  emoji: string;
  remainingDuration?: number;
  activatedAt?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  level: number;
  xp: number;
  maxXp: number;
  coins: number;
  streak: number;
  lives: number;
  profilePicture?: string;
  profileBackground?: string;
  university?: string;
  isUniversityStudent?: boolean;
  achievements?: Achievement[];
  borders?: Border[];
  tags?: Tag[];
  activeBorder?: Border | null;
  activeTag?: Tag | null;
  powers?: Power[];
  activePowers?: ActivePower[];
  role?: string;
}
