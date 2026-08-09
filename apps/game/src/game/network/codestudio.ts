import { getSharedAuthToken, redirectToWebLogin } from "./auth";
import { getApiUrl } from "../../config/env";

const API_URL = getApiUrl();

// Mismo guard que network/http.ts: sin esto, un token vencido hacía fallar
// en silencio cada acción de CodeStudio para siempre, sin ningún camino de
// vuelta al login.
let redirectingToLogin = false;

function handleUnauthorized() {
  if (redirectingToLogin || typeof window === "undefined") return;
  redirectingToLogin = true;
  localStorage.removeItem("token");
  redirectToWebLogin();
}

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

  if (res.status === 401) {
    handleUnauthorized();
  }

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

export function hireCodeStudioEmployee(companyId: string, employeeTypeId: string) {
  return request<any>(`/codestudio/companies/${companyId}/employees`, {
    method: "POST",
    body: JSON.stringify({ employeeTypeId }),
  });
}

export function installCodeStudioInfrastructure(companyId: string, infrastructureTypeId: string) {
  return request<any>(`/codestudio/companies/${companyId}/infrastructure`, {
    method: "POST",
    body: JSON.stringify({ infrastructureTypeId }),
  });
}

export function deleteCodeStudioCompany(companyId: string) {
  return request<{ id: string; name: string }>(`/codestudio/companies/${companyId}`, {
    method: "DELETE",
  });
}

export function fixCodeStudioBug(companyId: string, bugId: string, method: "cash" | "employee", employeeId?: string) {
  return request<any>(`/codestudio/companies/${companyId}/bugs/${bugId}/fix`, {
    method: "POST",
    body: JSON.stringify({ method, employeeId }),
  });
}

export function launchCodeStudioCampaign(companyId: string, campaignId: string) {
  return request<any>(`/codestudio/companies/${companyId}/campaigns`, {
    method: "POST",
    body: JSON.stringify({ campaignId }),
  });
}

export function unlockCodeStudioTechnology(companyId: string, technologyId: string) {
  return request<any>(`/codestudio/companies/${companyId}/technologies`, {
    method: "POST",
    body: JSON.stringify({ technologyId }),
  });
}

export function getCodeStudioRanking() {
  return request<any[]>("/codestudio/ranking");
}
