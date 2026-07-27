import type { DashboardUser, ReferralOverview } from "../types/dashboard";

export function getDashboardMetrics(user: DashboardUser, referrals: ReferralOverview | null) {
  const level = user.level ?? 1;
  const xp = user.experience ?? 0;
  const nextLevel = Math.max((level + 1) * 500, 500);
  const validated = referrals?.stats.validated ?? 0;
  const referralTarget = Math.max(referrals?.nextReward?.threshold ?? validated, 1);
  const rank = referrals?.leaderboard?.currentRank?.currentRank ?? null;
  return { level, xp, nextLevel, xpRemaining: Math.max(nextLevel - xp, 0), coins: user.coins ?? 0, streak: user.streak ?? 0, rank, referralTarget, referralMissing: Math.max(referralTarget - validated, 0) };
}
