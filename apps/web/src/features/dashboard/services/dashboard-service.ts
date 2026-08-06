import { dashboardApi } from "../api/dashboard-api";
import type { ContinueLearningCourse, DailyMission, DashboardUser, ReferralOverview, TopPlayerEntry } from "../types/dashboard";

export const dashboardService = {
  getUser: (): Promise<DashboardUser> => dashboardApi.getUser(),
  getReferrals: (): Promise<ReferralOverview> => dashboardApi.getReferrals(),
  getContinueLearning: (): Promise<ContinueLearningCourse[]> => dashboardApi.getContinueLearning(),
  getTopPlayers: async (): Promise<TopPlayerEntry[]> => {
    const rankings = await dashboardApi.getRankings();
    return rankings.topXp.entries.slice(0, 3);
  },
  getDailyMission: async (): Promise<DailyMission | null> => {
    const { items } = await dashboardApi.getMissions();
    // Prioriza una diaria sin reclamar todavía (lo más "misión de hoy"),
    // después cualquier otra sin reclamar, y si ya reclamó todo, muestra
    // igual la primera diaria como referencia de qué la resetea mañana.
    const unclaimedDaily = items.find((m) => m.cadence === "DAILY" && m.progress.status !== "CLAIMED");
    const unclaimedAny = items.find((m) => m.progress.status !== "CLAIMED");
    const anyDaily = items.find((m) => m.cadence === "DAILY");
    return unclaimedDaily ?? unclaimedAny ?? anyDaily ?? items[0] ?? null;
  },
};
