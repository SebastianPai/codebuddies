import {
  BarChart3,
  Building2,
  Code2,
  DollarSign,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  Megaphone,
  Server,
  Settings,
  Trophy,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

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
  modules: Array<{ moduleId: string; module: { id: string; slug: string; name: string; category: string; effects?: any } }>;
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
    infrastructureType: { id: string; name: string; category?: string };
  }>;
  employees: Array<{
    id: string;
    name: string;
    avatar?: string;
    age?: number;
    level: number;
    motivation?: number;
    stress?: number;
    salary?: number;
    productivity?: number;
    speed?: number;
    quality?: number;
    employeeType: { slug: string; name: string; category?: string };
  }>;
  bugReports: Array<{
    id: string;
    kind: string;
    title: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    status: "OPEN" | "FIXED";
    fixCost: number;
    createdAt: string;
  }>;
  marketingSummary: Array<{
    channel: string;
    gainedUsers: number;
    spent: number;
    runs: number;
  }>;
  technologies: Array<{
    id: string;
    unlockedAt: string;
    technology: { id: string; slug: string; name: string; category: string };
  }>;
  snapshots: Array<{
    activeUsers: number;
    newUsers?: number;
    lostUsers?: number;
    revenue: number;
    expenses: number;
    retention?: number;
    conversion?: number;
    errors?: number;
    latency?: number;
    rating: number;
    createdAt: string;
  }>;
  events?: Array<{ id: string; title: string; description?: string; createdAt: string; effects?: any }>;
};

export type Catalog = {
  appTypes: Array<{ id: string; name: string; description?: string; icon?: string; color?: string; category: string; difficulty: number }>;
  modules: Array<{
    id: string;
    slug: string;
    name: string;
    category: string;
    cost: number;
    developmentSeconds: number;
    difficulty: number;
    effects?: any;
    requirements?: { requires?: string[] };
  }>;
  campaigns?: Array<{ id: string; name: string; channel: string; baseCost: number; effects?: any }>;
  technologies?: Array<{
    id: string;
    slug: string;
    name: string;
    description?: string;
    category: string;
    cost: number;
    order: number;
    effects?: { stability?: number; latency?: number };
    requirements?: { requires?: string[] };
  }>;
  research?: Array<{ id: string; name: string; cost: number; durationSeconds: number }>;
  employees?: Array<{ id: string; slug: string; name: string; category: string; salary: number; icon?: string }>;
  infrastructure?: Array<{ id: string; slug: string; name: string; category: string; baseCost: number; icon?: string }>;
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

// Qué guía de ExplainerTour mostrar al navegar a una vista desde
// TutorialPanel — "elegí primera feature"/"contratá"/"instalá infra" son
// los tres pasos donde el jugador reportó no entender qué hacer, así que
// además de cambiar de vista se le explica el concepto con un par de
// slides antes de dejarlo interactuar solo.
export type GuideKey = "feature" | "hire" | "infra";

// labelKey en vez de un label literal — este array es una constante de
// módulo (no un componente), así que no puede llamar a useTranslation() acá;
// CodeStudio.tsx resuelve el texto real con t(item.labelKey) al renderizar.
export const nav: Array<{ key: ViewKey; labelKey: string; icon: LucideIcon }> = [
  { key: "dashboard", labelKey: "codestudioGeneral.nav.dashboard", icon: LayoutDashboard },
  { key: "company", labelKey: "codestudioGeneral.nav.company", icon: Building2 },
  { key: "apps", labelKey: "codestudioGeneral.nav.apps", icon: LayoutGrid },
  { key: "development", labelKey: "codestudioGeneral.nav.development", icon: Code2 },
  { key: "roadmap", labelKey: "codestudioGeneral.nav.roadmap", icon: GitBranch },
  { key: "backlog", labelKey: "codestudioGeneral.nav.backlog", icon: ListChecks },
  { key: "employees", labelKey: "codestudioGeneral.nav.employees", icon: Users },
  { key: "clients", labelKey: "codestudioGeneral.nav.clients", icon: UserCheck },
  { key: "marketing", labelKey: "codestudioGeneral.nav.marketing", icon: Megaphone },
  { key: "infrastructure", labelKey: "codestudioGeneral.nav.infrastructure", icon: Server },
  { key: "research", labelKey: "codestudioGeneral.nav.research", icon: FlaskConical },
  { key: "finance", labelKey: "codestudioGeneral.nav.finance", icon: DollarSign },
  { key: "analytics", labelKey: "codestudioGeneral.nav.analytics", icon: BarChart3 },
  { key: "ranking", labelKey: "codestudioGeneral.nav.ranking", icon: Trophy },
  { key: "settings", labelKey: "codestudioGeneral.nav.settings", icon: Settings },
];
