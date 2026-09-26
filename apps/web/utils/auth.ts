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
  nameEffectId?: string | null;
  unlockedEffectIds?: string[];
  isPremium?: boolean;
  uiLanguage?: string | null;
  // true solo en la respuesta donde el backend acaba de extender la racha
  // (ver IdentityService.applyDailyLoginStreak) -- nunca en un reinicio a 1.
  streakJustIncreased?: boolean;
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
  clearMeCache();

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

// /identity/me se pedía una vez por CADA componente que usa useAuth()
// (navbar, chat, hub de recompensas, la página…) en cada carga, y otra vez
// por cada uno tras cada recompensa. Ahora todas esas llamadas comparten una
// sola petición en vuelo y reutilizan la respuesta por unos segundos.
const ME_CACHE_MS = 5000;
let meInflight: Promise<User | null> | null = null;
let meCache: { user: User; at: number; token: string } | null = null;

function clearMeCache() {
  meCache = null;
  meInflight = null;
}

async function fetchCurrentUser(token: string): Promise<User | null> {
  try {
    const user = await api.get<User>("/identity/me");

    if (user?.userId) {
      localStorage.setItem("userId", user.userId.trim());
      localStorage.setItem("user", JSON.stringify(user));
      meCache = { user, at: Date.now(), token };
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

export async function getCurrentUser(
  options: { force?: boolean } = {},
): Promise<User | null> {
  const token = localStorage.getItem("token")?.trim() ?? "";
  if (
    !options.force &&
    meCache &&
    meCache.token === token &&
    Date.now() - meCache.at < ME_CACHE_MS
  ) {
    return meCache.user;
  }
  if (meInflight && !options.force) return meInflight;

  const request = fetchCurrentUser(token);
  meInflight = request;
  try {
    return await request;
  } finally {
    if (meInflight === request) meInflight = null;
  }
}

export function logout(redirect = true) {
  clearMeCache();
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
  // force: acá sí hace falta el dato fresco; los useAuth() que reaccionan al
  // evento reutilizan esta misma respuesta en vez de pedir cada uno la suya.
  await getCurrentUser({ force: true });
  emitAuthChanged();
}
