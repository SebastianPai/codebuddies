export type ReferralProfile = {
  referralCode: string;
  referralLink: string;
};

export type ReferralStats = {
  pending: number;
  validated: number;
  fraud: number;
  revoked: number;
};

export type ReferralRewardItem = {
  id: string;
  category?: string | null;
  translations?: Array<{ name: string }>;
};

export type ReferralRecord = {
  id: string;
  status: string;
  createdAt: string;
  validatedAt?: string | null;
  referralCodeUsed?: string;
  referred?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    email?: string;
    level?: number;
  };
  referrer?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    email?: string;
    level?: number;
  };
  rewardGrants?: Array<{
    id: string;
    reward?: { name?: string | null } | null;
    rewardType?: string;
  }>;
};

export type ReferralGrant = {
  id: string;
  grantedAt: string;
  status: string;
  rewardType: string;
  reward?: { name?: string | null } | null;
  item?: ReferralRewardItem | null;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    email?: string;
    level?: number;
  } | null;
  referral?: {
    id: string;
    referred?: {
      id: string;
      username: string;
      avatarUrl?: string | null;
    } | null;
  } | null;
};

export type ReferralLeaderboardEntry = {
  id: string;
  currentRank: number | null;
  validatedReferrals: number;
  pendingReferrals: number;
  user: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    level?: number;
  };
};

export type ReferralOverview = {
  profile: ReferralProfile;
  config?: {
    shareMessage?: string | null;
  } | null;
  stats: ReferralStats;
  referrals: ReferralRecord[];
  incomingReferral?: {
    id: string;
    status: string;
    createdAt: string;
    validatedAt?: string | null;
    referrer: {
      id: string;
      username: string;
      avatarUrl?: string | null;
    };
    requirements: Array<{
      key: string;
      label: string;
      current: number;
      target: number;
      completed: boolean;
    }>;
    missing: Array<{
      key: string;
      label: string;
      current: number;
      target: number;
      completed: boolean;
    }>;
    completed: boolean;
  } | null;
  nextReward?: {
    id: string;
    name: string;
    threshold?: number | null;
    amount?: number | null;
    rewardType?: string;
    item?: ReferralRewardItem | null;
  } | null;
  rewardTree?: Array<{
    id: string;
    name: string;
    description?: string | null;
    threshold?: number | null;
    amount?: number | null;
    rewardType?: string;
    progressState: "COMPLETED" | "CURRENT" | "UPCOMING";
    missing: number;
    item?: ReferralRewardItem | null;
  }>;
  grants: ReferralGrant[];
  leaderboard: {
    season?: { name: string; periodKey?: string } | null;
    currentRank?: ReferralLeaderboardEntry | null;
    top: ReferralLeaderboardEntry[];
  };
};
