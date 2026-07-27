export interface DashboardUser {
  userId: string;
  email: string;
  username: string;
  role: string;
  experience: number;
  coins: number;
  level: number;
  streak: number;
  completions?: number;
  certificates?: number;
  enrollments?: number;
}

export interface ReferralOverview {
  profile?: { referralCode?: string };
  stats: { validated: number };
  referrals: unknown[];
  nextReward?: { threshold?: number | null; name: string } | null;
  leaderboard?: { currentRank?: { currentRank?: number | null } | null };
}

export interface DashboardCourse { titleKey: string; categoryKey: string; progress: number; lessons: number; image: string; }
export interface TopPlayer { name: string; xp: string; }
