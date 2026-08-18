import { api } from "@/shared/api";

export interface WorldPulse {
  onlineNow: number;
  today: {
    exercisesCompleted: number;
    missionsCompleted: number;
    certificatesEarned: number;
    coinsEarned: number;
    xpEarned: number;
    activeLearnersToday: number;
  };
}

export const worldPulseApi = {
  get: () => api.get<WorldPulse>("/rankings/world-pulse"),
};
