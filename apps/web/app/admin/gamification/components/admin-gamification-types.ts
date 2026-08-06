export type AdminReward = {
  type: string;
  amount?: number;
  itemId?: string;
  label: string;
};

export type AdminMission = {
  id: string;
  name: string;
  description: string;
  condition: string;
  cadence: string;
  requiredValue: number;
  active: boolean;
  visibility: string;
  repeatable: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  rewards: AdminReward[];
  category?: { id: string; name: string } | null;
  _count?: { progress: number };
};

export type AdminAchievement = {
  id: string;
  name: string;
  description: string;
  condition: string;
  requiredValue: number;
  visible: boolean;
  rewards: AdminReward[];
  _count?: { unlockedBy: number };
};

export type RewardBundle = {
  id: string;
  name: string;
  description?: string | null;
  rewards: AdminReward[];
  active: boolean;
};

export type CatalogItem = {
  id: string;
  name?: string;
  description?: string | null;
  rarity?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
  active?: boolean;
  translations?: Array<{ name: string; description?: string | null }>;
  item?: CatalogItem;
};
