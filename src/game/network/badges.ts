// network/badges.ts — cliente REST de /badges (ver apps/api BadgesController)

import { apiGet, apiPost } from "./http";

export type BadgeStatus = { verified: boolean; isCreator: boolean };

export type BadgeConfig = {
  VERIFIED: { iconUrl: string | null };
  CREATOR: { iconUrl: string | null };
};

export function getBadgeConfig() {
  return apiGet<BadgeConfig>("/badges/config");
}

export function getUserBadges(username: string) {
  return apiGet<BadgeStatus>(`/badges/user/${encodeURIComponent(username)}`);
}

export function getUsersBadges(usernames: string[]) {
  return apiPost<Record<string, BadgeStatus>>("/badges/users", { usernames });
}
