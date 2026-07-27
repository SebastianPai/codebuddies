import { getSharedAuthToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function request<T>(path: string, options: RequestInit = {}) {
  const token = getSharedAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "CodeStudio no pudo completar la accion");
  }

  return res.json() as Promise<T>;
}

export function getCodeStudio() {
  return request<any>("/codestudio/me");
}

export function createCodeStudioCompany(appTypeId: string, name: string) {
  return request<any>("/codestudio/companies", {
    method: "POST",
    body: JSON.stringify({ appTypeId, name }),
  });
}

export function startCodeStudioDevelopment(companyId: string, moduleId: string) {
  return request<any>(`/codestudio/companies/${companyId}/development`, {
    method: "POST",
    body: JSON.stringify({ moduleId }),
  });
}
