import {
  BookOpen,
  Building2,
  Bug,
  DollarSign,
  GitBranch,
  LayoutDashboard,
  Megaphone,
  Server,
  Settings,
  Trophy,
  Award,
  Users,
  type LucideIcon,
} from "lucide-react";

// Espejo de la respuesta de la API (codestudio.service.ts → buildView y
// codestudio-catalog.service.ts → catalog). Si cambias uno, cambia el otro.

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FeatureEffects = Partial<
  Record<
    | "growth"
    | "viral"
    | "retention"
    | "arpu"
    | "conversion"
    | "satisfaction"
    | "load"
    | "capacity"
    | "latency"
    | "stability"
    | "quality"
    | "security"
    | "cacDiscount",
    number
  >
>;

export type CatalogFeature = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  branch: string;
  lesson: string;
  cost: number;
  devSeconds: number;
  difficulty: number;
  requires: string[];
  minStage: number;
  xp: number;
  effects: FeatureEffects;
};

export type Catalog = {
  appTypes: Array<{
    id: string;
    slug: string;
    name: string;
    icon: string | null;
    color: string | null;
    category: string;
    difficulty: number;
    description: string | null;
    minFounderLevel: number;
    startingCash: number;
  }>;
  branches: Array<{ key: string; name: string; description: string }>;
  features: CatalogFeature[];
  roles: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    category: string;
    salary: number;
    hireCost: number;
    devPower: number;
    canFixBugs: boolean;
  }>;
  hosting: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    install: number;
    monthly: number;
    capacity: number;
    latency: number;
    stability: number;
    maxLevel: number;
    minStage: number;
  }>;
  channels: Array<{ id: string; slug: string; name: string; channel: string; baseCost: number; minStage: number }>;
  budgetMultipliers: number[];
  stages: Array<{ index: number; name: string; tagline: string; reward: { cash: number; xp: number; coins: number } }>;
  milestones: Array<{ key: string; name: string; description: string; howTo: string; xp: number; coins: number }>;
  fundingRounds: Array<{ index: number; name: string; minStage: number; minRaise: number; equity: number }>;
  priceLevels: Array<{ value: number; label: string }>;
};

export type Profile = {
  xp: number;
  level: number;
  levelXp: number;
  nextLevelXp: number;
  startingCashBonus: number;
  // XP repetible que el juego ya sumó hoy a tu nivel, y su tope diario.
  gameXpToday: number;
  gameXpCap: number;
  codestudioXp: number;
  companiesFounded: number;
  bankruptcies: number;
  bugsDiagnosed: number;
  bugsFirstTry: number;
  bestValuation: number;
  milestones: Array<{ key: string; at: string }>;
  totalMilestones: number;
  daily: {
    day: string;
    missions: Array<{ key: string; label: string; target: number; progress: number; done: boolean; xp: number; coins: number }>;
    bonus: { xp: number; coins: number; done: boolean };
    resetsInMinutes: number;
  };
};

export type CompanySummary = {
  id: string;
  name: string;
  status: string;
  stage: number;
  valuation: number;
  activeUsers: number;
  cash: number;
  failedAt: string | null;
  appType: { name: string; color: string | null; icon: string | null; slug: string };
};

export type StudioState = { companies: CompanySummary[]; catalog: Catalog; profile: Profile };

export type Metrics = {
  launched: boolean;
  dailyRevenue: number;
  dailyCosts: number;
  dailyProfit: number;
  dailySalaries: number;
  dailyInfra: number;
  dailyNewUsers: number;
  dailyLostUsers: number;
  churn: number;
  arpu: number;
  ltv: number;
  load: number;
  capacity: number;
  utilization: number;
  runwayDays: number | null;
  devPower: number;
  maxParallel: number;
  quality: number;
  security: number;
  cacDiscount: number;
  satisfactionTarget: number;
  supportGap: number;
};

export type TreeState = "installed" | "developing" | "queued" | "available" | "locked" | "locked-stage";

export type StageGoal = {
  label: string;
  current: number;
  target: number;
  kind: "min" | "max" | "flag";
  format: "users" | "money" | "rating" | "percent" | "flag";
  met: boolean;
};

export type PublicBug = {
  id: string;
  title: string;
  severity: Severity;
  symptom: string;
  evidence: string[];
  options: Array<{ key: string; label: string }>;
  attempts: number;
  consultantCost: number;
  diagnoseCost: number;
  wrongCost: number;
  xpReward: number;
  assignedEmployeeId: string | null;
  fixSecondsLeft: number | null;
  employeeFixSeconds: number;
  createdAt: string;
};

export type ChannelQuote = {
  id: string;
  slug: string;
  name: string;
  channel: string;
  minStage: number;
  locked: boolean;
  fit: number;
  fatigue: number;
      /** Descuento de la oferta del momento (0 si no hay). */
      deal?: number;
  quotes: Array<{ multiplier: number; cost: number; users: number; cac: number }>;
};

export type ActivityEvent = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  tone: "good" | "bad" | "neutral";
  createdAt: string;
  // Solo en logros: lo que pagaron (para el aviso de celebración).
  xp?: number;
  coins?: number;
};

export type CompanyView = {
  id: string;
  name: string;
  status: "IDEA" | "BUILDING" | "LIVE" | "PAUSED" | "FAILED";
  appType: { id: string; slug: string; name: string; color: string | null; icon: string | null; description: string | null };
  cash: number;
  valuation: number;
  activeUsers: number;
  totalUsers: number;
  satisfaction: number;
  rating: number;
  reputation: number;
  techDebt: number;
  stability: number;
  latency: number;
  founderEquity: number;
  priceLevel: number;
  debtDays: number;
  daysUntilBankruptcy: number | null;
  gameDays: number;
  failedAt: string | null;
  failureReason: string | null;
  metrics: Metrics;
  stage: {
    index: number;
    name: string;
    tagline: string;
    goals: StageGoal[];
    next: { name: string; reward: { cash: number; xp: number; coins: number } } | null;
  };
  tree: Array<{ slug: string; state: TreeState; fit: number; missing: string[] }>;
  legacyFeatures: Array<{ name: string; category: string }>;
  development: Array<{ id: string; slug: string; name: string; progress: number; queued: boolean; remainingSeconds: number | null; refund: number }>;
  employees: Array<{
    id: string;
    name: string;
    roleSlug: string;
    roleName: string;
    salary: number;
    severance: number;
    canFixBugs: boolean;
    busy: boolean;
    // Rasgo, estadísticas y rendimiento (opcionales: API anterior).
    trait?: { key: string; tone: "good" | "neutral" | "bad"; name: string; description: string };
    stats?: { featuresShipped: number; bugsFixed: number; bugsCaused: number };
    performance?: number;
    daysInTeam?: number;
    gender?: "MALE" | "FEMALE";
    age?: number;
    card?: { overall: number; vel: number; cal: number; cre: number; pro: number; mot: number; exp: number };
    seniority?: { key: string; name: string; progress: number };
    skin?: { key: string; spriteSheetUrl: string | null; frameWidth: number; frameHeight: number } | null;
  }>;
  hosting: Array<{ typeId: string; slug: string; name: string; level: number; maxLevel: number; capacity: number; monthly: number; upgradeCost: number; legacy: boolean }>;
  bugs: PublicBug[];
  pendingDecision: { id: string; title: string; description: string | null; choices: Array<{ key: string; label: string; hint: string }>; daysLeft: number } | null;
  events: ActivityEvent[];
  snapshots: Array<{ activeUsers: number; revenue: number; expenses: number; rating: number; createdAt: string }>;
  marketing: { channels: ChannelQuote[]; summary: Array<{ channel: string; gainedUsers: number; spent: number; runs: number }> };
  funding: { name: string; raise: number; equity: number; minStage: number; minStageName: string; available: boolean; minRating: number } | null;
  profile: Profile;
};

export type BugFixResult =
  | { correct: true; feedback: string; lesson: string; preventHint: string | null; xp: number; cost: number; firstTry: boolean }
  | { correct: false; feedback: string; cost: number }
  | { assigned: true; seconds: number }
  | { paid: number };

export type ViewKey = "panel" | "guide" | "tree" | "bugs" | "team" | "office" | "infra" | "marketing" | "finance" | "career" | "ranking" | "settings";

// labelKey y no texto: CodeStudio.tsx lo resuelve con t() al renderizar.
export const nav: Array<{ key: ViewKey; labelKey: string; icon: LucideIcon }> = [
  { key: "panel", labelKey: "codestudio.nav.panel", icon: LayoutDashboard },
  { key: "guide", labelKey: "codestudio.nav.guide", icon: BookOpen },
  { key: "tree", labelKey: "codestudio.nav.tree", icon: GitBranch },
  { key: "bugs", labelKey: "codestudio.nav.bugs", icon: Bug },
  { key: "team", labelKey: "codestudio.nav.team", icon: Users },
  { key: "office", labelKey: "codestudio.nav.office", icon: Building2 },
  { key: "infra", labelKey: "codestudio.nav.infra", icon: Server },
  { key: "marketing", labelKey: "codestudio.nav.marketing", icon: Megaphone },
  { key: "finance", labelKey: "codestudio.nav.finance", icon: DollarSign },
  { key: "career", labelKey: "codestudio.nav.career", icon: Award },
  { key: "ranking", labelKey: "codestudio.nav.ranking", icon: Trophy },
  { key: "settings", labelKey: "codestudio.nav.settings", icon: Settings },
];
