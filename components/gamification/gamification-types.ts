export type RewardType =
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

export type RewardConfig = {
  type: RewardType | string;
  amount?: number | null;
  itemId?: string | null;
  label?: string;
  message?: string;
};

export type MissionProgressStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLAIMED";

export type MissionItem = {
  id: string;
  name: string;
  description: string;
  icon?: string | null;
  imageUrl?: string | null;
  cadence: string;
  condition: string;
  requiredValue: number;
  rewards: RewardConfig[];
  category?: { name: string; icon?: string | null; color?: string | null } | null;
  progress: {
    currentValue: number;
    targetValue: number;
    status: MissionProgressStatus;
    percentage: number;
    claimedAt?: string | null;
  };
};

export type MissionsPayload = {
  summary: {
    total: number;
    completed: number;
    claimed: number;
    pending: number;
    xpEarned: number;
    coinsEarned: number;
    objectsEarned: number;
    level: number;
  };
  items: MissionItem[];
};

export type AchievementItem = {
  id: string;
  name: string;
  description: string;
  icon?: string | null;
  imageUrl?: string | null;
  condition: string;
  requiredValue: number;
  rewards: RewardConfig[];
  currentValue: number;
  percentage: number;
  unlocked: boolean;
  unlockedAt?: string | null;
};

export type AchievementsPayload = {
  summary: { total: number; unlocked: number; locked: number };
  items: AchievementItem[];
};

export type RewardLedgerEntry = {
  id: string;
  sourceType: string;
  rewardType: RewardType | string;
  amount?: number | null;
  label: string;
  message?: string | null;
  grantedAt: string;
  item?: { imageUrl?: string | null; translations?: Array<{ name: string }> } | null;
};
