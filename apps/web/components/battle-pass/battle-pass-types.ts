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

export type BattlePassTier = {
  id: string;
  level: number;
  track: BattlePassTrackName;
  rewardType: BattlePassRewardType;
  amount?: number | null;
  itemId?: string | null;
  label: string;
  sortOrder: number;
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
