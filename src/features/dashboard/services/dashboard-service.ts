import { dashboardApi } from "../api/dashboard-api";
import type { DashboardUser, ReferralOverview } from "../types/dashboard";
export const dashboardService = { getUser: (): Promise<DashboardUser> => dashboardApi.getUser(), getReferrals: (): Promise<ReferralOverview> => dashboardApi.getReferrals() };
