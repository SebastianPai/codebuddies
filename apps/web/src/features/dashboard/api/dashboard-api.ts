import { api } from "@/shared/api";
import type { ContinueLearningCourse, DailyMission, DashboardUser, ReferralOverview } from "../types/dashboard";

interface RankingsResponse {
  topXp: { entries: Array<{ rank: number; userId: string; username: string; value: number }> };
}

interface MissionsResponse {
  items: DailyMission[];
}

export const dashboardApi = {
  getUser: () => api.get<DashboardUser>("/identity/me"),
  getReferrals: () => api.get<ReferralOverview>("/referrals/me"),
  getContinueLearning: () =>
    api.get<ContinueLearningCourse[]>("/progress/continue-learning?take=3"),
  getRankings: () => api.get<RankingsResponse>("/rankings"),
  getMissions: () => api.get<MissionsResponse>("/missions"),
};
