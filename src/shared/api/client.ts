import { getApiUrl } from "@/config/env";

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

export type ApiException = Error & ApiError;

type RequestBody = BodyInit | object | null | undefined;

function createUrl(endpoint: string): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${getApiUrl()}${path}`;
}

function createHeaders(options: RequestInit, token: string | null): Headers {
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

function serializeBody(body: RequestBody): BodyInit | undefined {
  if (!body || body instanceof FormData || typeof body === "string") {
    return body ?? undefined;
  }

  return JSON.stringify(body);
}

async function parseError(response: Response): Promise<ApiException> {
  let details: unknown;
  let message = `Error ${response.status}`;

  try {
    details = await response.json();
    if (
      typeof details === "object" &&
      details !== null &&
      "message" in details &&
      typeof details.message === "string"
    ) {
      message = details.message;
    }
  } catch {
    const text = await response.text();
    message = text || message;
  }

  const error = new Error(message) as ApiException;
  error.status = response.status;
  error.details = details;

  return error;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = typeof window === "undefined" ? null : localStorage.getItem("token");
  const headers = createHeaders(options, token);
  const body = options.body;

  if (!(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept-Language") && typeof window !== "undefined") {
    headers.set("Accept-Language", localStorage.getItem("lang") || "es");
  }

  const response = await fetch(createUrl(endpoint), {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return (response.status === 204 ? {} : response.json()) as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: RequestBody, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: serializeBody(body),
    }),
  put: <T>(endpoint: string, body?: RequestBody, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: serializeBody(body),
    }),
  patch: <T>(endpoint: string, body?: RequestBody, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: serializeBody(body),
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: "DELETE" }),
};
