// network/friendships.ts — cliente REST de /friendships (ver apps/api FriendshipsController)

import { apiDelete, apiGet, apiPatch, apiPost } from "./http";

export type FriendshipStatus = "NONE" | "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";
export type FriendshipDirection = "INCOMING" | "OUTGOING" | null;

export type PersonSummary = {
  id: string;
  username: string;
  avatarUrl?: string | null;
  nameEffectId?: string | null;
  level?: number;
  online?: boolean;
};

export type Friend = {
  id: string; // id de la Friendship
  friend: PersonSummary;
  online: boolean;
};

export type FriendRequest = {
  id: string;
  requester: PersonSummary;
  addressee: PersonSummary;
  createdAt: string;
};

export type SearchResult = PersonSummary & {
  friendship?: { id?: string; status: FriendshipStatus; direction?: FriendshipDirection };
  mutualCount: number;
};

export function getFriends() {
  return apiGet<Friend[]>("/friendships");
}

export function getFriendRequests() {
  return apiGet<FriendRequest[]>("/friendships/requests");
}

export function getSentRequests() {
  return apiGet<FriendRequest[]>("/friendships/sent");
}

export function searchUsers(query: string) {
  return apiGet<SearchResult[]>(`/friendships/search?q=${encodeURIComponent(query)}`);
}

export function getSuggestions() {
  return apiGet<SearchResult[]>("/friendships/suggestions");
}

export function getFriendshipStatus(username: string) {
  return apiGet<{
    id?: string;
    status: FriendshipStatus;
    direction?: FriendshipDirection;
    followersCount?: number;
    followingCount?: number;
  }>(`/friendships/status/${encodeURIComponent(username)}`);
}

export function getMutualFriends(username: string) {
  return apiGet<{ count: number; preview: PersonSummary[] }>(
    `/friendships/mutual/${encodeURIComponent(username)}`,
  );
}

export function sendFriendRequest(userId: string) {
  return apiPost("/friendships/requests", { userId });
}

export function acceptFriendRequest(id: string) {
  return apiPatch(`/friendships/${id}/accept`);
}

export function rejectFriendRequest(id: string) {
  return apiPatch(`/friendships/${id}/reject`);
}

export function blockFriendship(id: string) {
  return apiPatch(`/friendships/${id}/block`);
}

export function blockUser(userId: string) {
  return apiPost("/friendships/blocks", { userId });
}

export function removeFriendship(id: string) {
  return apiDelete(`/friendships/${id}`);
}
