import { api } from "@/shared/api";
import type { DashboardUser, ReferralOverview } from "../types/dashboard";
export const dashboardApi = { getUser: () => api.get<DashboardUser>("/identity/me"), getReferrals: () => api.get<ReferralOverview>("/referrals/me") };
