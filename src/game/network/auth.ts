// network/auth.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

export type GameUser = {
  userId: string;
  id?: string;
  email: string;
  username: string;
  role?: string;
  level?: number;
  coins?: number;
  diamonds?: number;
  avatar?: any;
};

function getCookieValue(name: string) {
  if (typeof document === "undefined") return null;

  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.split("=")
      .slice(1)
      .join("=") || null
  );
}

function consumeTokenFromUrl() {
  if (typeof window === "undefined") return null;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const token =
    hashParams.get("codebuddies_token") ||
    queryParams.get("codebuddies_token") ||
    null;

  if (!token) return null;

  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, document.title, cleanUrl);

  return token.trim();
}

export function getSharedAuthToken() {
  if (typeof window === "undefined") return null;

  const urlToken = consumeTokenFromUrl();
  if (urlToken) {
    localStorage.setItem("token", urlToken);
    return urlToken;
  }

  return (
    localStorage.getItem("token")?.trim() ||
    decodeURIComponent(getCookieValue("codebuddies_token") || "") ||
    null
  );
}

function storeGameSession(token: string | null, user: GameUser) {
  if (!token || !user?.userId) return;

  localStorage.setItem("token", token);
  localStorage.setItem("userId", user.userId);
  localStorage.setItem("user", JSON.stringify(user));
}

export function redirectToWebLogin() {
  const returnTo = encodeURIComponent(window.location.href);
  window.location.href = `${WEB_URL}/login?redirect=${returnTo}`;
}

export async function getCurrentUser() {
  try {
    const token = getSharedAuthToken();

    const res = await fetch(`${API_URL}/identity/me`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!res.ok) {
      return null;
    }

    const user = (await res.json()) as GameUser;
    storeGameSession(token, user);
    return user;
  } catch (err) {
    console.error("Error fetching current user:", err);
    return null;
  }
}
