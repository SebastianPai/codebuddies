// network/http.ts
//
// Helper compartido para las llamadas REST autenticadas del sistema social
// (friendships/messages/notifications/profiles). Mismo patrón ya usado a mano
// en RightSidebar.tsx (fetch + credentials:'include' + Authorization Bearer),
// centralizado para no repetirlo en ~30 funciones.

import { getSharedAuthToken, redirectToWebLogin } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Antes un 401 (token vencido/inválido) se propagaba como un ApiError más:
// cada feature que usa este helper (~30 funciones) fallaba en silencio para
// siempre, sin ningún camino de vuelta al login salvo refrescar la página a
// mano. El guard evita disparar el redirect más de una vez si varias
// llamadas devuelven 401 casi al mismo tiempo.
let redirectingToLogin = false;

function handleUnauthorized() {
  if (redirectingToLogin || typeof window === "undefined") return;
  redirectingToLogin = true;
  localStorage.removeItem("token");
  redirectToWebLogin();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getSharedAuthToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.message || `REQUEST_FAILED_${response.status}`);
  }

  if (response.status === 204) return undefined as T;

  return response.json();
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}
