import { getSharedAuthToken, redirectToWebLogin } from "./auth";
import { getApiUrl } from "../../config/env";
import type { BugFixResult, CompanyView, StudioState } from "../components/CodeStudio/types";

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

// El contenido del juego (features, bugs, eventos) y los mensajes vienen
// del servidor ya traducidos: se pide en el idioma elegido en el juego
// (mismo valor que guarda LanguageContext en localStorage "lang").
function currentLang() {
  try {
    return (typeof window !== "undefined" && window.localStorage.getItem("lang")) || "es";
  } catch {
    return "es";
  }
}

async function request<T>(path: string, options: RequestInit = {}) {
  const token = getSharedAuthToken();
  const separator = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API_URL}${path}${separator}lang=${encodeURIComponent(currentLang())}`, {
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
    const message = Array.isArray(error.message) ? error.message.join(" ") : error.message;
    throw new Error(message || "CodeStudio no pudo completar la acción");
  }

  return res.json() as Promise<T>;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const getCodeStudio = () => request<StudioState>("/codestudio/me");

// Lo llama el cliente cada ~10s: cada llamada avanza la simulación.
export const getCodeStudioCompany = (companyId: string) => request<CompanyView>(`/codestudio/companies/${companyId}`);

export const getCodeStudioRanking = () => request<RankingRow[]>("/codestudio/ranking");

export const createCodeStudioCompany = (appTypeId: string, name: string) =>
  post<CompanyView>("/codestudio/companies", { appTypeId, name });

export const deleteCodeStudioCompany = (companyId: string) =>
  request<{ id: string; name: string }>(`/codestudio/companies/${companyId}`, { method: "DELETE" });

export const startCodeStudioDevelopment = (companyId: string, moduleId: string) =>
  post<CompanyView>(`/codestudio/companies/${companyId}/development`, { moduleId });

export const cancelCodeStudioDevelopment = (companyId: string, taskId: string) =>
  request<CompanyView>(`/codestudio/companies/${companyId}/development/${taskId}`, { method: "DELETE" });

export const setCodeStudioAdBudget = (companyId: string, budget: number) => post<CompanyView>(`/codestudio/companies/${companyId}/ads`, { budget });

export const hireCodeStudioEmployee = (companyId: string, employeeTypeId: string, candidateIndex?: number) =>
  post<CompanyView>(`/codestudio/companies/${companyId}/employees`, { employeeTypeId, ...(candidateIndex !== undefined ? { candidateIndex } : {}) });

export type ReferralOverview = {
  link: string | null;
  code: string | null;
  milestones: { founded: number; pmf: number; unicorn: number; purchase: number };
  friendStartingBonus: number;
  networkDiscount: number;
  networkDiscountPerFriend: number;
  networkDiscountMax: number;
  coinsEarned: number;
  friends: Array<{ username: string; avatarUrl: string | null; founded: boolean; pmf: boolean; unicorn: boolean; purchase: boolean }>;
  invitedBySomeone: boolean;
};
export const getCodeStudioReferrals = () => request<ReferralOverview>(`/codestudio/referrals`);

export type Candidate = {
  index: number;
  name: string;
  gender: string;
  age: number;
  seniority: { key: string; name: string };
  trait: { key: string; tone: "good" | "neutral" | "bad"; name: string; description: string };
  salary: number;
  hireCost: number;
  hired: boolean;
  impact: {
    speed: { delta: number; total: number };
    bugs: number | null;
    salaries: number;
    fit: number;
    reasons: Array<{ tone: "good" | "bad"; text: string }>;
  };
};
export const getCodeStudioCandidates = (companyId: string, roleId: string) =>
  request<{ refreshInMinutes: number; candidates: Candidate[] }>(`/codestudio/companies/${companyId}/candidates/${roleId}`);

export const fireCodeStudioEmployee = (companyId: string, employeeId: string) =>
  request<CompanyView>(`/codestudio/companies/${companyId}/employees/${employeeId}`, { method: "DELETE" });

export const installCodeStudioInfrastructure = (companyId: string, infrastructureTypeId: string) =>
  post<CompanyView>(`/codestudio/companies/${companyId}/infrastructure`, { infrastructureTypeId });

export const launchCodeStudioCampaign = (companyId: string, campaignId: string, multiplier: number) =>
  post<CompanyView>(`/codestudio/companies/${companyId}/campaigns`, { campaignId, multiplier });

export const fixCodeStudioBug = (
  companyId: string,
  bugId: string,
  body: { method: "diagnose" | "employee" | "cash"; optionKey?: string; employeeId?: string },
) => post<{ result: BugFixResult; company: CompanyView }>(`/codestudio/companies/${companyId}/bugs/${bugId}/fix`, body);

export const chooseCodeStudioDecision = (companyId: string, eventId: string, choice: string) =>
  post<CompanyView>(`/codestudio/companies/${companyId}/decisions/${eventId}`, { choice });

export const raiseCodeStudioFunding = (companyId: string) => post<CompanyView>(`/codestudio/companies/${companyId}/funding`);

// ─── Oficina ─────────────────────────────────────────────────────────────
export type OfficeLayout = { id: string; name: string; previewImageUrl: string | null; width: number; height: number; price: number };
export type OfficeState = {
  room: { id: string; name: string } | null;
  layouts: OfficeLayout[];
  counts: { desk: number; chair: number; pc: number; snacks: number; water: number; coffee: number } | null;
  summary: { hasOffice: boolean; stations: number; seated: number; unseated: number; amenities: string[]; bonus: number };
  furnitureAvailable: boolean;
  kit: { available: boolean; claimed: number; pending: number };
};
export type EmployeeAvatarLook = {
  skinColor: number;
  slots: Array<{
    slot: string;
    itemId: string | null;
    imageUrl: string | null;
    layer: number;
    color: number | null;
    colorable: boolean;
    sprites: Array<{ imageUrl: string; frameWidth: number; frameHeight: number; framesCount: number; rows: number; animation: { speed: number; loop: boolean } }>;
  }>;
};

export type OfficeRoomEmployee = {
  id: string;
  name: string;
  roleSlug: string;
  roleName: string;
  seated: boolean;
  trait: { key: string; tone: string; name: string; description: string } | null;
  stats: { featuresShipped: number; bugsFixed: number; bugsCaused: number } | null;
  performance: number;
  card: { overall: number; vel: number; cal: number; cre: number; pro: number; mot: number; exp: number } | null;
  skin: { key: string; spriteSheetUrl: string | null; frameWidth: number; frameHeight: number } | null;
  /** Armado por piezas, como un jugador (si no tiene skin completa). */
  avatar?: EmployeeAvatarLook | null;
  lines?: string[];
  npc: {
    key: string;
    name: string;
    spriteSheetUrl: string | null;
    frameWidth: number;
    frameHeight: number;
    directions: number;
    animations: unknown;
    greetingLines: string[];
    idleLines: string[];
  } | null;
};
export const getCodeStudioOffice = (companyId: string) => request<OfficeState>(`/codestudio/companies/${companyId}/office`);
export const createCodeStudioOffice = (companyId: string, layoutId: string) =>
  post<{ room: { id: string; name: string } }>(`/codestudio/companies/${companyId}/office`, { layoutId });
export const claimCodeStudioOfficeKit = (companyId: string) => post<{ granted: number }>(`/codestudio/companies/${companyId}/office/kit`);
export const getOfficeRoomEmployees = (roomId: string) =>
  request<{
    company: { id: string; name: string } | null;
    employees: OfficeRoomEmployee[];
    /** Charlas entre empleados: cada una es una lista de (quién, qué dice). */
    conversations?: Array<Array<{ employeeId: string; text: string }>>;
  }>(`/codestudio/office/room/${encodeURIComponent(roomId)}`);

export const setCodeStudioPricing = (companyId: string, level: number) =>
  post<CompanyView>(`/codestudio/companies/${companyId}/pricing`, { level });

export type RankingRow = {
  id: string;
  name: string;
  valuation: number;
  activeUsers: number;
  stage: number;
  founderEquity: number;
  appType?: { name?: string; color?: string | null } | null;
  user?: { username?: string } | null;
};
