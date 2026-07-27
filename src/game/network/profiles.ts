// network/profiles.ts — cliente REST de /profiles (ver apps/api ProfilesController)

import { apiDelete, apiGet, apiPost } from "./http";
import { FriendshipDirection, FriendshipStatus } from "./friendships";

export type PublicProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  avatarBorder?: string | null;
  level: number;
  xp: number;
  coursesCompleted: number;
  certificatesEarned: number;
  followers: number;
  following: number;
  joinDate: string;
  xpRank?: number | null;
  isFollowing: boolean;
  friendshipId?: string | null;
  friendshipStatus: FriendshipStatus;
  friendshipDirection?: FriendshipDirection;
  mutualFriends: number;
};

export function getPublicProfile(username: string) {
  return apiGet<PublicProfile>(`/profiles/${encodeURIComponent(username)}`);
}

export function followUser(username: string) {
  return apiPost(`/profiles/${encodeURIComponent(username)}/follow`);
}

export function unfollowUser(username: string) {
  return apiDelete(`/profiles/${encodeURIComponent(username)}/follow`);
}
