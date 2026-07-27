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

export type ProfileRoom = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  isVipOnly: boolean;
  maxUsers: number;
  thumbnailUrl: string | null;
  background: { name: string; imageUrl: string; previewUrl: string | null } | null;
  rating: number;
  totalVotes: number;
  _count: { users: number };
  /** false para salas privadas ajenas: hay que pedir permiso, no se entra directo. */
  canJoinDirectly: boolean;
  /** Estado de la solicitud del usuario que mira el perfil, si ya pidió entrar. */
  joinRequestStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
};

export function getPublicProfile(username: string) {
  return apiGet<PublicProfile>(`/profiles/${encodeURIComponent(username)}`);
}

export function getPublicProfileRooms(username: string) {
  return apiGet<ProfileRoom[]>(`/profiles/${encodeURIComponent(username)}/rooms`);
}

export function followUser(username: string) {
  return apiPost(`/profiles/${encodeURIComponent(username)}/follow`);
}

export function unfollowUser(username: string) {
  return apiDelete(`/profiles/${encodeURIComponent(username)}/follow`);
}
