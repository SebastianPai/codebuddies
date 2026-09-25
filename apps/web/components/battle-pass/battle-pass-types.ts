export type BattlePassTrackName = "FREE" | "PREMIUM";

export type BattlePassRewardType =
  | "COINS"
  | "XP"
  | "ITEM"
  | "AVATAR_ITEM"
  | "FURNITURE"
  | "PET"
  | "BADGE"
  | "TITLE"
  | "ROLE"
  | "CUSTOM";

// Logo de insignia junto al nombre (mismo formato que /badges/config).
// Solo viene en el ticket del logo Premium.
export type BattlePassBadgeIcon = {
  iconUrl: string | null;
  mode: "STATIC" | "SPRITE";
  size: number;
  frameCount: number;
  direction: "PINGPONG" | "LOOP";
  frameRate: number;
};

export type BattlePassTier = {
  id: string;
  level: number;
  track: BattlePassTrackName;
  rewardType: BattlePassRewardType;
  amount?: number | null;
  itemId?: string | null;
  label: string;
  sortOrder: number;
  badgeIcon?: BattlePassBadgeIcon | null;
  levelReached: boolean;
  trackUnlocked: boolean;
  claimed: boolean;
  claimable: boolean;
};

export type BattlePassSeason = {
  id: string;
  name: string;
  description?: string | null;
  seasonNumber: number;
  status: "UPCOMING" | "ACTIVE" | "ENDED";
  startsAt: string;
  endsAt: string;
  totalLevels: number;
  xpPerLevel: number;
};

export type BattlePassProgress = {
  /** DAILY: un nivel por cada día que el usuario entra. XP: por XP. */
  mode?: "XP" | "DAILY";
  xp: number;
  level: number;
  xpPerLevel: number;
  totalLevels: number;
  xpIntoLevel: number;
  isMaxLevel: boolean;
};

export type BattlePassState = {
  season: BattlePassSeason | null;
  hasPremium: boolean;
  progress: BattlePassProgress | null;
  tiers: BattlePassTier[];
};
