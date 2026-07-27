export type Company = {
  id: string;
  name: string;
  status: string;
  cash: number;
  valuation: number;
  reputation?: number;
  innovation?: number;
  activeUsers: number;
  totalUsers: number;
  revenue: number;
  expenses: number;
  satisfaction: number;
  bugs: number;
  latency: number;
  stability: number;
  rating: number;
  appType: { name: string; color?: string; icon?: string };
  modules: Array<{ moduleId: string; module: { id: string; name: string; category: string; effects?: any } }>;
  development: Array<{
    id: string;
    status: string;
    progress: number;
    spentSeconds?: number;
    requiredSeconds?: number;
    module: { id: string; name: string; category?: string; cost?: number; effects?: any };
  }>;
  infrastructure: Array<{
    level: number;
    capacity?: number;
    latency?: number;
    stability?: number;
    cost?: number;
    infrastructureType: { name: string; category?: string };
  }>;
  employees: Array<{
    name: string;
    avatar?: string;
    age?: number;
    level: number;
    motivation?: number;
    stress?: number;
    salary?: number;
    productivity?: number;
    employeeType: { name: string; category?: string };
  }>;
  snapshots: Array<{
    activeUsers: number;
    newUsers?: number;
    lostUsers?: number;
    revenue: number;
    expenses: number;
    errors?: number;
    latency?: number;
    rating: number;
    createdAt: string;
  }>;
  events?: Array<{ id: string; title: string; description?: string; createdAt: string }>;
};

export type Catalog = {
  appTypes: Array<{ id: string; name: string; description?: string; color?: string; category: string; difficulty: number }>;
  modules: Array<{
    id: string;
    name: string;
    category: string;
    cost: number;
    developmentSeconds: number;
    difficulty: number;
    effects?: any;
  }>;
  campaigns?: Array<{ id: string; name: string; channel: string; baseCost: number; effects?: any }>;
  technologies?: Array<{ id: string; name: string; category: string; cost: number }>;
  research?: Array<{ id: string; name: string; cost: number; durationSeconds: number }>;
};

export type StudioState = {
  companies: Company[];
  catalog: Catalog;
};

export type ViewKey =
  | "dashboard"
  | "company"
  | "apps"
  | "development"
  | "roadmap"
  | "backlog"
  | "employees"
  | "clients"
  | "marketing"
  | "infrastructure"
  | "research"
  | "finance"
  | "analytics"
  | "ranking"
  | "settings";

export type BacklogPriority = "Urgente" | "Alta" | "Media" | "Baja";

export const nav: Array<{ key: ViewKey; label: string; icon: string }> = [
  { key: "dashboard", label: "Dashboard", icon: "⌘" },
  { key: "company", label: "Empresa", icon: "◆" },
  { key: "apps", label: "Aplicaciones", icon: "▦" },
  { key: "development", label: "Desarrollo", icon: "⚙" },
  { key: "roadmap", label: "Roadmap", icon: "⇄" },
  { key: "backlog", label: "Backlog", icon: "☰" },
  { key: "employees", label: "Empleados", icon: "◎" },
  { key: "clients", label: "Clientes", icon: "◉" },
  { key: "marketing", label: "Marketing", icon: "◌" },
  { key: "infrastructure", label: "Infraestructura", icon: "▣" },
  { key: "research", label: "Investigacion", icon: "✦" },
  { key: "finance", label: "Finanzas", icon: "$" },
  { key: "analytics", label: "Analiticas", icon: "▱" },
  { key: "ranking", label: "Ranking", icon: "▲" },
  { key: "settings", label: "Config", icon: "⋯" },
];
