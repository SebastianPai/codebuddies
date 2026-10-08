import { api } from "@/shared/api";
import { getCurrentUser } from "@/../utils/auth";
import type { ContinueLearningCourse, DailyMission, DashboardUser, ReferralOverview } from "../types/dashboard";

interface RankingsResponse {
  topXp: { entries: Array<{ rank: number; userId: string; username: string; value: number }> };
}

interface MissionsResponse {
  items: DailyMission[];
}

export const dashboardApi = {
  // Misma petición/cache que useAuth (utils/auth) en vez de un /me propio.
  getUser: async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    return user as unknown as DashboardUser;
  },
  getReferrals: () => api.get<ReferralOverview>("/referrals/me"),
  getContinueLearning: () =>
    api.get<ContinueLearningCourse[]>("/progress/continue-learning?take=3"),
  getRankings: () => api.get<RankingsResponse>("/rankings"),
  getMissions: () => api.get<MissionsResponse>("/missions"),
};
