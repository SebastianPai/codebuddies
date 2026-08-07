"use client";

import { api } from "./api";

export interface User {
  userId: string;
  id?: string;
  email: string;
  username: string;
  role: "STUDENT" | "ADMIN";
  experience?: number;
  coins?: number;
  level?: number;
  streak?: number;
  bestStreak?: number;
  marketingEmailsEnabled?: boolean;
}

interface AuthResponse {
  access_token: string;
  user: User;
}

export const AUTH_CHANGED_EVENT = "codebuddies:auth-changed";

function emitAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function storeAuthSession(data: AuthResponse) {
  if (!data.access_token || !data.user?.userId) {
    throw new Error("Invalid auth response: missing token or user.userId");
  }

  localStorage.setItem("token", data.access_token.trim());
  localStorage.setItem("userId", data.user.userId.trim());
  localStorage.setItem("user", JSON.stringify(data.user));
  emitAuthChanged();
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("token")?.trim();
  const userId = localStorage.getItem("userId")?.trim();
  return !!token && !!userId && userId !== "null" && userId !== "";
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>("/identity/login", {
    email,
    password,
  });
  storeAuthSession(data);
  return data;
}

export async function register(
  username: string,
  email: string,
  password: string,
  referralCode?: string,
): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>("/identity/register", {
    username,
    email,
    password,
    referralCode,
  });
  storeAuthSession(data);
  return data;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await api.get<User>("/identity/me");

    if (user?.userId) {
      localStorage.setItem("userId", user.userId.trim());
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    }

    return null;
  } catch (err) {
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? (err as { status?: number }).status
        : undefined;

    if (status === 401 || status === 403) {
      logout(false);
    }

    return null;
  }
}

export function logout(redirect = true) {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("user");
  emitAuthChanged();

  if (redirect && typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export async function refreshAuth(): Promise<boolean> {
  const currentUser = await getCurrentUser();
  return !!currentUser;
}

// Refresca level/experience/coins/streak desde el backend y avisa a
// cualquier componente que use useAuth() (ej. el navbar) para que se
// repinte con el total actualizado. Se llama tras cada recompensa
// (ver RewardContext.showReward) — sin esto, "el total" solo se veía
// recién en el próximo login o al recargar /dashboard.
export async function refreshUserStats(): Promise<void> {
  await getCurrentUser();
  emitAuthChanged();
}
