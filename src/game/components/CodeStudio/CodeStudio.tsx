"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createCodeStudioCompany,
  getCodeStudio,
  startCodeStudioDevelopment,
} from "../../network/codestudio";
import "./CodeStudio.css";

type Company = {
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

type Catalog = {
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

type StudioState = {
  companies: Company[];
  catalog: Catalog;
};

type ViewKey =
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

type BacklogPriority = "Urgente" | "Alta" | "Media" | "Baja";

const nav: Array<{ key: ViewKey; label: string; icon: string }> = [
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

function format(value: number) {
  return new Intl.NumberFormat("es-CO").format(Math.round(value || 0));
}

function secondsLabel(seconds?: number) {
  const safe = Math.max(0, Math.round(seconds ?? 0));
  if (safe < 60) return `${safe}s`;
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}m ${rest}s`;
}

function percent(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(0)}%`;
}

export default function CodeStudio() {
  const [state, setState] = useState<StudioState | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedAppTypeId, setSelectedAppTypeId] = useState("");
  const [companyName, setCompanyName] = useState("Pixel Startup");
  const [view, setView] = useState<ViewKey>("dashboard");
  const [moduleSearch, setModuleSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [priority, setPriority] = useState<Record<string, BacklogPriority>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const data = await getCodeStudio();
      setState(data);
      setSelectedCompanyId((current) => current || data.companies?.[0]?.id || "");
      setSelectedAppTypeId((current) => current || data.catalog?.appTypes?.[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar CodeStudio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedCompany = useMemo(
    () => state?.companies.find((company) => company.id === selectedCompanyId) ?? state?.companies[0],
    [selectedCompanyId, state?.companies],
  );

  const installedModuleIds = new Set(selectedCompany?.modules.map((entry) => entry.module.id) ?? []);
  const developingModuleIds = new Set(
    selectedCompany?.development
      .filter((task) => ["QUEUED", "IN_PROGRESS"].includes(task.status))
      .map((task) => task.module.id) ?? [],
  );

  const availableModules = useMemo(
    () =>
      (state?.catalog.modules ?? []).filter((module) => {
        if (installedModuleIds.has(module.id) || developingModuleIds.has(module.id)) return false;
        const query = moduleSearch.trim().toLowerCase();
        return !query || `${module.name} ${module.category}`.toLowerCase().includes(query);
      }),
    [state?.catalog.modules, installedModuleIds, developingModuleIds, moduleSearch],
  );

  const groupedModules = useMemo(() => {
    return availableModules.reduce<Record<string, typeof availableModules>>((groups, module) => {
      groups[module.category] = groups[module.category] ?? [];
      groups[module.category].push(module);
      return groups;
    }, {});
  }, [availableModules]);

  const notifications = useMemo(() => makeNotifications(selectedCompany), [selectedCompany]);
  const bugs = useMemo(() => makeBugs(selectedCompany), [selectedCompany]);
  const clients = useMemo(() => makeClients(selectedCompany), [selectedCompany]);
  const npcCompanies = useMemo(() => makeNpcCompanies(selectedCompany), [selectedCompany]);
  const trends = useMemo(() => makeTrends(state?.catalog), [state?.catalog]);
  const objectives = useMemo(() => makeObjectives(selectedCompany), [selectedCompany]);

  const createCompany = async () => {
    if (!selectedAppTypeId || !companyName.trim()) return;
    setLoading(true);
    try {
      const company = await createCodeStudioCompany(selectedAppTypeId, companyName.trim());
      await load();
      setSelectedCompanyId(company.id);
      setView("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la empresa.");
      setLoading(false);
    }
  };

  const develop = async (moduleId: string) => {
    if (!selectedCompany) return;
    await startCodeStudioDevelopment(selectedCompany.id, moduleId);
    await load();
    setView("development");
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading && !state) {
    return <div className="codestudio-shell codestudio-loading">Iniciando CodeStudio OS...</div>;
  }

  return (
    <div className="codestudio-shell">
      <header className="cs-app-header">
        <div>
          <span className="codestudio-chip">Fase 1.6 Live Ops</span>
          <h2>{selectedCompany ? selectedCompany.name : "Nuevo estudio"}</h2>
          <p>{selectedCompany ? `${selectedCompany.appType.name} · ${selectedCompany.status}` : "Crea una startup desde un blueprint"}</p>
        </div>
        <div className="cs-actions">
          <span className="cs-live-indicator"><i /> Live ticks</span>
          <button onClick={() => void load()}>Sincronizar</button>
        </div>
      </header>

      <aside className="cs-sidebar">
        <div className="cs-brand">
          <span>CB</span>
          <div>
            <b>CodeStudio</b>
            <small>Startup OS</small>
          </div>
        </div>

        <div className="cs-company-switcher">
          <label>Empresa activa</label>
          <select value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)}>
            {state?.companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="cs-nav">
          {nav.map((item) => (
            <button key={item.key} className={view === item.key ? "active" : ""} onClick={() => setView(item.key)}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="cs-workspace">
        {error && <div className="codestudio-error">{error}</div>}

        <section className="codestudio-create">
          <select value={selectedAppTypeId} onChange={(event) => setSelectedAppTypeId(event.target.value)}>
            {state?.catalog.appTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} · dificultad {type.difficulty}
              </option>
            ))}
          </select>
          <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Nombre de la startup" />
          <button onClick={() => void createCompany()}>Crear empresa</button>
        </section>

        {!selectedCompany ? (
          <section className="cs-empty-state">
            <b>Tu garaje digital esta listo.</b>
            <p>Elige un tipo de app, ponle nombre a la empresa y lanza el primer prototipo.</p>
          </section>
        ) : (
          <section className="cs-view">
            {view === "dashboard" && (
              <DashboardView
                company={selectedCompany}
                notifications={notifications}
                objectives={objectives}
                trends={trends}
                onNavigate={setView}
              />
            )}
            {view === "company" && <CompanyView company={selectedCompany} />}
            {view === "apps" && <AppTreeView company={selectedCompany} />}
            {view === "development" && <DevelopmentView company={selectedCompany} />}
            {view === "roadmap" && <RoadmapView company={selectedCompany} availableModules={availableModules} onDevelop={develop} />}
            {view === "backlog" && (
              <BacklogView
                modules={availableModules}
                priority={priority}
                setPriority={setPriority}
                onDevelop={develop}
              />
            )}
            {view === "employees" && <EmployeesLiveView company={selectedCompany} />}
            {view === "clients" && <ClientsView clients={clients} bugs={bugs} />}
            {view === "marketing" && <MarketingView catalog={state?.catalog} company={selectedCompany} />}
            {view === "infrastructure" && <InfrastructureView company={selectedCompany} />}
            {view === "research" && <ResearchView catalog={state?.catalog} trends={trends} />}
            {view === "finance" && <FinanceView company={selectedCompany} />}
            {view === "analytics" && <AnalyticsView company={selectedCompany} />}
            {view === "ranking" && <RankingView company={selectedCompany} npcs={npcCompanies} />}
            {view === "settings" && <SettingsView company={selectedCompany} />}

            {["roadmap", "backlog", "apps"].includes(view) && (
              <ModuleLibrary
                groupedModules={groupedModules}
                expanded={expanded}
                setExpanded={setExpanded}
                moduleSearch={moduleSearch}
                setModuleSearch={setModuleSearch}
                onDevelop={develop}
              />
            )}
          </section>
        )}
      </main>

      <footer className="cs-footer">
        <span>Motor: ticks automaticos cada 10s</span>
        <span>Objetivo: {objectives[0]?.label ?? "Crear empresa"}</span>
        <span>Actividad: {notifications[0]?.title ?? "Esperando primer evento"}</span>
      </footer>
    </div>
  );
}

function DashboardView({
  company,
  notifications,
  objectives,
  trends,
  onNavigate,
}: {
  company: Company;
  notifications: ReturnType<typeof makeNotifications>;
  objectives: ReturnType<typeof makeObjectives>;
  trends: ReturnType<typeof makeTrends>;
  onNavigate: (view: ViewKey) => void;
}) {
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-8">
        <div className="cs-panel-header">
          <div>
            <h3>Command Center</h3>
            <p>Resumen vivo de tu empresa, producto y comunidad.</p>
          </div>
          <strong>${format(company.cash)}</strong>
        </div>
        <Kpis company={company} />
        <MiniChart snapshots={company.snapshots} metric="activeUsers" label="Usuarios activos" />
      </section>

      <section className="cs-panel cs-span-4">
        <ActivityTimeline notifications={notifications} />
      </section>

      <section className="cs-panel cs-span-5">
        <h3>Objetivos</h3>
        {objectives.map((goal) => (
          <ProgressRow key={goal.label} label={goal.label} value={goal.current} max={goal.target} hint={goal.scope} />
        ))}
      </section>

      <TutorialPanel company={company} onNavigate={onNavigate} />

      <section className="cs-panel cs-span-4">
        <h3>Tendencias</h3>
        <div className="cs-tags">
          {trends.map((trend) => (
            <button key={trend.label} onClick={() => onNavigate("research")}>
              {trend.label}
              <small>{trend.score}%</small>
            </button>
          ))}
        </div>
      </section>

      <section className="cs-panel cs-span-3">
        <ActionBriefing company={company} notifications={notifications} onNavigate={onNavigate} />
      </section>
    </div>
  );
}

function Kpis({ company }: { company: Company }) {
  const kpis = [
    ["Empresa", `$${format(company.valuation)}`, "Valor"],
    ["Usuarios", format(company.activeUsers), `${format(company.totalUsers)} total`],
    ["Ingresos", `$${format(company.revenue)}`, `Gastos $${format(company.expenses)}`],
    ["Rating", company.rating.toFixed(1), `${percent(company.satisfaction)} satisfaccion`],
    ["Empleados", String(company.employees.length), "equipo activo"],
    ["Infra", `${percent(company.stability)}`, `${company.latency.toFixed(0)}ms`],
  ];
  return (
    <div className="cs-kpis">
      {kpis.map(([label, value, hint]) => (
        <div key={label}>
          <span>{label}</span>
          <b>{value}</b>
          <small>{hint}</small>
        </div>
      ))}
    </div>
  );
}

function ActivityTimeline({ notifications }: { notifications: ReturnType<typeof makeNotifications> }) {
  const now = Date.now();
  return (
    <div className="cs-timeline">
      <div className="cs-panel-header">
        <div>
          <h3>Actividad en vivo</h3>
          <p>Eventos recientes generados por ticks, usuarios e infraestructura.</p>
        </div>
      </div>
      {notifications.map((item, index) => (
        <article key={`${item.title}-${index}`} className={`cs-timeline-item ${item.tone}`}>
          <time>{new Date(now - index * 120000).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</time>
          <span />
          <div>
            <b>{item.title}</b>
            <p>{item.message}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function ActionBriefing({
  company,
  notifications,
  onNavigate,
}: {
  company: Company;
  notifications: ReturnType<typeof makeNotifications>;
  onNavigate: (view: ViewKey) => void;
}) {
  const overloaded = company.latency > 180 || company.stability < 95;
  const hasActiveSprint = company.development.some((task) => ["QUEUED", "IN_PROGRESS"].includes(task.status));
  const nextView: ViewKey = overloaded ? "infrastructure" : hasActiveSprint ? "development" : "roadmap";
  const nextLabel = overloaded ? "Escalar infraestructura" : hasActiveSprint ? "Revisar sprint activo" : "Planear siguiente feature";
  const failed = company.bugs > 20 ? `${company.bugs.toFixed(0)} bugs estan afectando el rating.` : "No hay incidentes criticos.";
  const completed = company.modules.length > 0 ? `${company.modules.at(-1)?.module.name} esta en produccion.` : "Aun no hay releases.";

  return (
    <div className="cs-briefing">
      <h3>Briefing CEO</h3>
      <article>
        <span>Que esta pasando</span>
        <b>{notifications[0]?.title ?? "La empresa esta arrancando"}</b>
      </article>
      <article>
        <span>Que hago ahora</span>
        <button onClick={() => onNavigate(nextView)}>{nextLabel}</button>
      </article>
      <article>
        <span>Que termino</span>
        <p>{completed}</p>
      </article>
      <article>
        <span>Que fallo</span>
        <p>{failed}</p>
      </article>
    </div>
  );
}

function CompanyView({ company }: { company: Company }) {
  const versions = makeVersions(company);
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-7">
        <h3>Perfil de empresa</h3>
        <div className="cs-company-card">
          <div className="cs-logo" style={{ background: company.appType.color || "#22d3ee" }}>
            {company.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2>{company.name}</h2>
            <p>{company.appType.name} · {company.status}</p>
            <p>Reputacion {company.reputation?.toFixed?.(1) ?? "5.0"} · Innovacion {(company as any).innovation?.toFixed?.(1) ?? "1.0"}</p>
          </div>
        </div>
        <Kpis company={company} />
      </section>
      <section className="cs-panel cs-span-5">
        <h3>Version actual</h3>
        {versions.map((version) => (
          <article key={version.version} className="cs-version">
            <b>{version.version}</b>
            <small>{version.date}</small>
            <ul>
              {version.notes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}

function AppTreeView({ company }: { company: Company }) {
  return (
    <div className="cs-panel">
      <h3>Arbol visual de producto</h3>
      <p className="cs-muted">Vista de dependencias y crecimiento. No modifica el motor: visualiza los modulos instalados.</p>
      <div className="cs-tree">
        {company.modules.map((entry, index) => (
          <div key={entry.module.id} className="cs-node-wrap">
            <div className="cs-node">
              <span>{index + 1}</span>
              <b>{entry.module.name}</b>
              <small>{entry.module.category}</small>
            </div>
            {index < company.modules.length - 1 && <i />}
          </div>
        ))}
      </div>
    </div>
  );
}

function DevelopmentView({ company }: { company: Company }) {
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-8">
        <h3>Sprint activo</h3>
        <div className="cs-dev-list">
          {company.development.length === 0 && <p className="cs-muted">No hay tareas activas. Abre Roadmap o Backlog para iniciar una feature.</p>}
          {company.development.map((task, index) => {
            const remaining = Math.max(0, (task.requiredSeconds ?? 0) - (task.spentSeconds ?? 0));
            const employee = company.employees[index % Math.max(1, company.employees.length)];
            return (
              <article key={task.id} className="cs-dev-card">
                <div>
                  <b>{task.module.name}</b>
                  <span>{task.status}</span>
                </div>
                <ProgressBar value={task.progress} />
                <footer>
                  <small>Tiempo restante: {secondsLabel(remaining)}</small>
                  <small>Trabaja: {employee?.name ?? "Equipo core"}</small>
                  <small>Beneficio: +{Number(task.module.effects?.growth ?? 0.02).toFixed(2)} growth</small>
                </footer>
              </article>
            );
          })}
        </div>
      </section>
      <section className="cs-panel cs-span-4">
        <h3>Bugs activos</h3>
        {makeBugs(company).map((bug) => (
          <article key={bug.title} className="cs-bug">
            <span className={bug.severity}>{bug.severity}</span>
            <b>{bug.title}</b>
            <p>{bug.impact}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function RoadmapView({
  company,
  availableModules,
  onDevelop,
}: {
  company: Company;
  availableModules: Catalog["modules"];
  onDevelop: (moduleId: string) => void;
}) {
  const pending = availableModules.slice(0, 7);
  const development = company.development.filter((task) => ["QUEUED", "IN_PROGRESS"].includes(task.status) && task.progress < 70);
  const qa = company.development.filter((task) => ["QUEUED", "IN_PROGRESS"].includes(task.status) && task.progress >= 70);
  const release = company.development.filter((task) => task.status === "COMPLETED").slice(0, 6);
  const production = company.modules.slice(-7).reverse();
  return (
    <div className="cs-roadmap">
      <RoadmapColumn title="Pendiente" tone="pending">
        {pending.map((module) => (
          <button key={module.id} className="cs-roadmap-card" onClick={() => void onDevelop(module.id)}>
            <b>{module.name}</b>
            <small>{module.category} · ${module.cost}</small>
          </button>
        ))}
      </RoadmapColumn>
      <RoadmapColumn title="Desarrollo" tone="active">
        {development.map((task) => (
          <article key={task.id} className="cs-roadmap-card">
            <b>{task.module.name}</b>
            <ProgressBar value={task.progress} />
          </article>
        ))}
      </RoadmapColumn>
      <RoadmapColumn title="QA" tone="qa">
        {qa.map((task) => (
          <article key={task.id} className="cs-roadmap-card">
            <b>{task.module.name}</b>
            <small>Validando bugs, rendimiento y UX</small>
            <ProgressBar value={task.progress} />
          </article>
        ))}
      </RoadmapColumn>
      <RoadmapColumn title="Release" tone="release">
        {release.map((task) => (
          <article key={task.id} className="cs-roadmap-card done">
            <b>{task.module.name}</b>
            <small>Listo para publicar</small>
          </article>
        ))}
      </RoadmapColumn>
      <RoadmapColumn title="Produccion" tone="done">
        {production.map((entry) => (
          <article key={entry.module.id} className="cs-roadmap-card done">
            <b>{entry.module.name}</b>
            <small>{entry.module.category}</small>
          </article>
        ))}
      </RoadmapColumn>
    </div>
  );
}

function RoadmapColumn({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <section className={`cs-roadmap-column ${tone}`}>
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function TutorialPanel({ company, onNavigate }: { company: Company; onNavigate: (view: ViewKey) => void }) {
  const steps = [
    {
      label: "1. Blueprint inicial",
      done: company.modules.length >= 3,
      hint: "La app nace con sus modulos base instalados.",
      view: "apps" as ViewKey,
    },
    {
      label: "2. Primer sprint",
      done: company.development.length > 0,
      hint: "El equipo ya tiene trabajo real con progreso por ticks.",
      view: "development" as ViewKey,
    },
    {
      label: "3. Primeros usuarios",
      done: company.activeUsers > 0,
      hint: "Marketing, rating e infraestructura empujan el crecimiento.",
      view: "clients" as ViewKey,
    },
    {
      label: "4. Infra estable",
      done: company.stability >= 96 && company.latency <= 180,
      hint: "Evita saturacion antes de escalar.",
      view: "infrastructure" as ViewKey,
    },
    {
      label: "5. Roadmap publico",
      done: company.modules.length >= 6,
      hint: "Completa nuevas features hasta publicar una version fuerte.",
      view: "roadmap" as ViewKey,
    },
  ];
  const next = steps.find((step) => !step.done) ?? steps[steps.length - 1];

  return (
    <section className="cs-panel cs-span-3 cs-tutorial">
      <div className="cs-panel-header">
        <div>
          <h3>Asistente CEO</h3>
          <p>Ruta inicial para que la empresa arranque jugando, no como CRUD.</p>
        </div>
      </div>
      <div className="cs-tutorial-next">
        <span>{next.done ? "Siguiente ciclo" : "Ahora"}</span>
        <b>{next.label}</b>
        <p>{next.hint}</p>
        <button onClick={() => onNavigate(next.view)}>Ir al panel</button>
      </div>
      <div className="cs-tutorial-steps">
        {steps.map((step) => (
          <button key={step.label} className={step.done ? "done" : ""} onClick={() => onNavigate(step.view)}>
            <i />
            {step.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function BacklogView({
  modules,
  priority,
  setPriority,
  onDevelop,
}: {
  modules: Catalog["modules"];
  priority: Record<string, BacklogPriority>;
  setPriority: (value: Record<string, BacklogPriority>) => void;
  onDevelop: (moduleId: string) => void;
}) {
  const sorted = [...modules].slice(0, 24).sort((a, b) => {
    const weight = { Urgente: 0, Alta: 1, Media: 2, Baja: 3 };
    return (weight[priority[a.id] ?? "Media"] ?? 1) - (weight[priority[b.id] ?? "Media"] ?? 1);
  });
  return (
    <section className="cs-panel">
      <h3>Backlog priorizado</h3>
      <div className="cs-backlog">
        {sorted.map((module) => (
          <article key={module.id}>
            <div>
              <b>{module.name}</b>
              <small>{module.category} · dificultad {module.difficulty}</small>
            </div>
            <select
              value={priority[module.id] ?? "Media"}
              onChange={(event) => setPriority({ ...priority, [module.id]: event.target.value as BacklogPriority })}
            >
              <option>Urgente</option>
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
            <button onClick={() => void onDevelop(module.id)}>Desarrollar</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmployeesView({ company }: { company: Company }) {
  return (
    <div className="cs-people-grid">
      {company.employees.map((employee) => (
        <article key={employee.name} className="cs-person-card">
          <div className="cs-avatar">{employee.name.slice(0, 2).toUpperCase()}</div>
          <h3>{employee.name}</h3>
          <p>{employee.employeeType.name} · Nivel {employee.level}</p>
          <ProgressRow label="Motivacion" value={employee.motivation ?? 80} max={100} hint={`${employee.salary ?? 0} salario`} />
          <ProgressRow label="Estres" value={employee.stress ?? 5} max={100} hint="rendimiento" />
          <span>{employee.productivity?.toFixed?.(1) ?? "1.0"}x productividad</span>
        </article>
      ))}
    </div>
  );
}

function EmployeesLiveView({ company }: { company: Company }) {
  return (
    <div className="cs-people-grid">
      {company.employees.map((employee, index) => {
        const assignment = getEmployeeAssignment(company, index);
        return (
          <article key={employee.name} className="cs-person-card">
            <div className="cs-person-head">
              <div className="cs-avatar">{employee.name.slice(0, 2).toUpperCase()}</div>
              <span className={assignment.status === "Disponible" ? "idle" : "busy"}>{assignment.status}</span>
            </div>
            <h3>{employee.name}</h3>
            <p>{employee.employeeType.name} · Nivel {employee.level}</p>
            <div className="cs-current-task">
              <small>Trabajo actual</small>
              <b>{assignment.task}</b>
              <ProgressBar value={assignment.progress} />
              <em>{assignment.remaining}</em>
            </div>
            <ProgressRow label="Motivacion" value={employee.motivation ?? 80} max={100} hint={`$${format(employee.salary ?? 0)} salario`} />
            <ProgressRow label="Estres" value={employee.stress ?? 5} max={100} hint="rendimiento" />
            <span>{employee.productivity?.toFixed?.(1) ?? "1.0"}x productividad</span>
          </article>
        );
      })}
    </div>
  );
}

function getEmployeeAssignment(company: Company, employeeIndex: number) {
  const activeTasks = company.development.filter((task) => ["QUEUED", "IN_PROGRESS"].includes(task.status));
  const task = activeTasks[employeeIndex % Math.max(1, activeTasks.length)];
  if (!task) {
    return {
      status: "Disponible",
      task: company.bugs > 15 ? "Revisando bugs criticos" : "Soporte y discovery",
      progress: company.bugs > 15 ? Math.min(100, company.bugs) : 18,
      remaining: "Esperando siguiente prioridad",
    };
  }

  const remaining = Math.max(0, (task.requiredSeconds ?? 0) - (task.spentSeconds ?? 0));
  return {
    status: task.progress >= 70 ? "QA" : "Desarrollo",
    task: task.module.name,
    progress: task.progress,
    remaining: `Tiempo restante: ${secondsLabel(remaining)}`,
  };
}

function ClientsView({ clients, bugs }: { clients: ReturnType<typeof makeClients>; bugs: ReturnType<typeof makeBugs> }) {
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-8">
        <h3>Clientes procedurales</h3>
        <div className="cs-client-grid">
          {clients.map((client) => (
            <article key={client.name}>
              <span>{client.type}</span>
              <b>{client.name}</b>
              <p>"{client.comment}"</p>
              <ProgressRow label="Satisfaccion" value={client.satisfaction} max={100} hint={`${client.rating.toFixed(1)} estrellas`} />
            </article>
          ))}
        </div>
      </section>
      <section className="cs-panel cs-span-4">
        <h3>Problemas reportados</h3>
        {bugs.map((bug) => (
          <article key={bug.title} className="cs-bug">
            <span className={bug.severity}>{bug.severity}</span>
            <b>{bug.title}</b>
            <p>{bug.impact}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function MarketingView({ catalog, company }: { catalog?: Catalog; company: Company }) {
  return (
    <div className="cs-grid">
      {(catalog?.campaigns ?? []).map((campaign) => (
        <article key={campaign.id} className="cs-panel cs-span-3 cs-campaign">
          <span>{campaign.channel}</span>
          <h3>{campaign.name}</h3>
          <p>Costo base ${format(campaign.baseCost)}</p>
          <ProgressRow label="Conversion estimada" value={Math.min(100, 8 + company.rating * 12)} max={100} hint="+usuarios" />
        </article>
      ))}
    </div>
  );
}

function InfrastructureView({ company }: { company: Company }) {
  const users = Math.max(1, company.activeUsers);
  const indicators = makeInfrastructureIndicators(company);
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-12">
        <div className="cs-panel-header">
          <div>
            <h3>Centro de infraestructura</h3>
            <p>Indicadores vivos derivados de usuarios, latencia, estabilidad y capacidad.</p>
          </div>
          <strong>{company.latency.toFixed(0)}ms</strong>
        </div>
        <div className="cs-infra-indicators">
          {indicators.map((indicator) => (
            <article key={indicator.label}>
              <span>{indicator.icon}</span>
              <b>{indicator.label}</b>
              <ProgressBar value={indicator.value} />
              <small>{indicator.hint}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="cs-panel cs-span-12">
        <h3>Nodos instalados</h3>
        <div className="cs-infra-map">
          {company.infrastructure.map((item) => {
            const usage = Math.min(100, (users / Math.max(1, item.capacity ?? 1000)) * 100);
            return (
              <article key={item.infrastructureType.name} className="cs-infra-node">
                <div />
                <h3>{item.infrastructureType.name}</h3>
                <p>Nivel {item.level}</p>
                <ProgressRow label="Uso" value={usage} max={100} hint={`${format(item.capacity ?? 1000)} cap.`} />
                <ProgressRow label="Estado" value={item.stability ?? company.stability} max={100} hint={`${item.latency ?? company.latency}ms`} />
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ResearchView({ catalog, trends }: { catalog?: Catalog; trends: ReturnType<typeof makeTrends> }) {
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-5">
        <h3>Tendencias del mercado</h3>
        {trends.map((trend) => <ProgressRow key={trend.label} label={trend.label} value={trend.score} max={100} hint={trend.type} />)}
      </section>
      <section className="cs-panel cs-span-7">
        <h3>Investigaciones disponibles</h3>
        <div className="cs-research-list">
          {(catalog?.research ?? []).map((item) => (
            <article key={item.id}>
              <b>{item.name}</b>
              <small>${format(item.cost)} · {secondsLabel(item.durationSeconds)}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function FinanceView({ company }: { company: Company }) {
  const profit = company.revenue - company.expenses;
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-6">
        <h3>Finanzas</h3>
        <Kpis company={company} />
      </section>
      <section className="cs-panel cs-span-6">
        <h3>Burn rate</h3>
        <ProgressRow label="Ingresos" value={company.revenue} max={Math.max(1, company.revenue + company.expenses)} hint={`$${format(company.revenue)}`} />
        <ProgressRow label="Gastos" value={company.expenses} max={Math.max(1, company.revenue + company.expenses)} hint={`$${format(company.expenses)}`} />
        <div className={`cs-profit ${profit >= 0 ? "positive" : "negative"}`}>{profit >= 0 ? "Rentable" : "Quemando caja"} · ${format(Math.abs(profit))}</div>
      </section>
    </div>
  );
}

function AnalyticsView({ company }: { company: Company }) {
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="activeUsers" label="Usuarios" />
      </section>
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="revenue" label="Ingresos" />
      </section>
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="expenses" label="Gastos" />
      </section>
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="rating" label="Valoracion" />
      </section>
    </div>
  );
}

function RankingView({ company, npcs }: { company: Company; npcs: ReturnType<typeof makeNpcCompanies> }) {
  const rows: Array<{ name: string; valuation: number; users: number; you?: boolean }> = [
    { name: company.name, valuation: company.valuation, users: company.activeUsers, you: true },
    ...npcs,
  ]
    .sort((a, b) => b.valuation - a.valuation)
    .slice(0, 10);
  return (
    <section className="cs-panel">
      <h3>Competidores NPC</h3>
      <div className="cs-ranking">
        {rows.map((row, index) => (
          <article key={row.name} className={row.you ? "you" : ""}>
            <b>#{index + 1}</b>
            <span>{row.name}</span>
            <small>${format(row.valuation)} · {format(row.users)} usuarios</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsView({ company }: { company: Company }) {
  return (
    <section className="cs-panel">
      <h3>Configuracion de Live Ops</h3>
      <p className="cs-muted">CodeStudio avanza con los ticks del juego. Las opciones avanzadas se conectaran al motor en fases futuras.</p>
      <div className="cs-settings">
        <label><input type="checkbox" defaultChecked /> Notificaciones de eventos</label>
        <label><input type="checkbox" defaultChecked /> Animaciones de desarrollo</label>
        <label><input type="checkbox" defaultChecked /> Sincronizar al abrir la PC</label>
      </div>
      <pre>{JSON.stringify({ companyId: company.id, status: company.status }, null, 2)}</pre>
    </section>
  );
}

function ModuleLibrary({
  groupedModules,
  expanded,
  setExpanded,
  moduleSearch,
  setModuleSearch,
  onDevelop,
}: {
  groupedModules: Record<string, Catalog["modules"]>;
  expanded: Record<string, boolean>;
  setExpanded: (value: Record<string, boolean>) => void;
  moduleSearch: string;
  setModuleSearch: (value: string) => void;
  onDevelop: (moduleId: string) => void;
}) {
  return (
    <section className="cs-panel cs-module-library">
      <div className="cs-panel-header">
        <div>
          <h3>Biblioteca de features</h3>
          <p>120+ modulos agrupados por categoria. Busca, expande y decide que desarrollar.</p>
        </div>
        <input value={moduleSearch} onChange={(event) => setModuleSearch(event.target.value)} placeholder="Buscar modulo..." />
      </div>
      <div className="cs-module-groups">
        {Object.entries(groupedModules).map(([category, modules]) => {
          const isOpen = expanded[category] ?? Object.keys(expanded).length === 0;
          return (
            <article key={category}>
              <button onClick={() => setExpanded({ ...expanded, [category]: !isOpen })}>
                <b>{category}</b>
                <small>{modules.length} features</small>
              </button>
              {isOpen && (
                <div>
                  {modules.slice(0, 12).map((module) => (
                    <button key={module.id} onClick={() => void onDevelop(module.id)}>
                      <span>{module.name}</span>
                      <small>${module.cost} · {secondsLabel(module.developmentSeconds)}</small>
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MiniChart({ snapshots, metric, label }: { snapshots: Company["snapshots"]; metric: keyof Company["snapshots"][number]; label: string }) {
  const data = [...snapshots].reverse().slice(-18);
  const values = data.map((snapshot) => Number(snapshot[metric] ?? 0));
  const max = Math.max(1, ...values);
  return (
    <div className="cs-chart">
      <h3>{label}</h3>
      <div>
        {values.length === 0 ? (
          <span className="cs-muted">Sin historico todavia</span>
        ) : (
          values.map((value, index) => (
            <i key={`${metric}-${index}`} style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
          ))
        )}
      </div>
    </div>
  );
}

function ProgressRow({ label, value, max, hint }: { label: string; value: number; max: number; hint?: string }) {
  const width = Math.min(100, (value / Math.max(1, max)) * 100);
  return (
    <div className="cs-progress-row">
      <div>
        <span>{label}</span>
        <small>{hint}</small>
      </div>
      <ProgressBar value={width} />
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="cs-progress">
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function makeNotifications(company?: Company) {
  if (!company) return [];
  const liveEvents = (company.events ?? []).slice(0, 5).map((event) => ({
    type: "Actividad",
    tone: "info",
    title: event.title,
    message: event.description || new Date(event.createdAt).toLocaleString("es-CO"),
  }));

  return [
    ...liveEvents,
    {
      type: "Evento",
      tone: "info",
      title: company.activeUsers > 500 ? "Tendencia viral detectada" : "Primeros usuarios probando la app",
      message: company.activeUsers > 500 ? "La curva de usuarios esta acelerando. Revisa infraestructura." : "El mercado esta respondiendo al prototipo.",
    },
    {
      type: "Bug",
      tone: company.bugs > 20 ? "danger" : "warn",
      title: company.bugs > 20 ? "Errores afectando rating" : "QA encontro deuda tecnica",
      message: `${company.bugs.toFixed(0)} puntos de bugs acumulados.`,
    },
    {
      type: "Version",
      tone: "success",
      title: `Build v${Math.max(1, company.modules.length)}.${company.development.length}`,
      message: `${company.modules.length} features publicadas y ${company.development.length} en progreso.`,
    },
  ];
}

function makeBugs(company?: Company) {
  const bugs = Math.round(company?.bugs ?? 0);
  return [
    { title: "Error Login", severity: bugs > 25 ? "critico" : "medio", impact: "Afecta conversion de usuarios nuevos." },
    { title: "Error API", severity: bugs > 15 ? "alto" : "bajo", impact: "Incrementa latencia y tickets de soporte." },
    { title: "Error Rendimiento", severity: (company?.latency ?? 0) > 180 ? "alto" : "bajo", impact: "Reduce satisfaccion en clientes impacientes." },
    { title: "Error Base Datos", severity: (company?.stability ?? 100) < 96 ? "critico" : "medio", impact: "Riesgo de perdida de sesiones." },
  ];
}

function makeClients(company?: Company) {
  const satisfaction = company?.satisfaction ?? 70;
  const names = ["Diana Founder", "Mateo Gamer", "Lina Shopper", "Tomas Dev", "Sara Creator", "Nora Analyst"];
  const types = ["Power user", "Casual", "Premium", "Developer", "Creator", "Enterprise"];
  return names.map((name, index) => {
    const score = Math.max(10, Math.min(98, satisfaction + (index - 2) * 6));
    return {
      name,
      type: types[index],
      satisfaction: score,
      rating: Math.max(1, Math.min(5, score / 22)),
      comment:
        score > 75
          ? "La app se siente rapida y cada semana mejora."
          : score > 50
            ? "Me gusta, pero hay detalles que deberian pulir."
            : "Se cae demasiado, necesito una alternativa.",
    };
  });
}

function makeInfrastructureIndicators(company: Company) {
  const capacity = company.infrastructure.reduce((sum, item) => sum + (item.capacity ?? 1000), 0) || 1000;
  const load = Math.min(100, (company.activeUsers / capacity) * 100);
  const latencyPressure = Math.min(100, (company.latency / 240) * 100);
  const bugPressure = Math.min(100, company.bugs);
  const stability = Math.max(0, Math.min(100, company.stability));

  return [
    { label: "CPU", icon: "CPU", value: Math.max(12, load + bugPressure * 0.25), hint: `${format(company.activeUsers)} usuarios activos` },
    { label: "RAM", icon: "RAM", value: Math.max(18, load * 0.82 + company.modules.length * 3), hint: `${company.modules.length} features en memoria` },
    { label: "Red", icon: "NET", value: Math.max(10, latencyPressure), hint: `${company.latency.toFixed(0)}ms promedio` },
    { label: "Disco", icon: "SSD", value: Math.min(100, 18 + company.totalUsers / 80 + company.snapshots.length * 2), hint: `${format(company.totalUsers)} usuarios historicos` },
    { label: "Cache", icon: "L1", value: Math.max(0, 100 - latencyPressure), hint: latencyPressure > 65 ? "Necesita optimizacion" : "Operando estable" },
    { label: "Firewall", icon: "FW", value: stability, hint: `${percent(stability)} estabilidad` },
    { label: "CDN", icon: "CDN", value: Math.max(15, 100 - latencyPressure * 0.7), hint: "Distribucion de assets" },
    { label: "Balanceador", icon: "LB", value: Math.max(10, 100 - load), hint: `${format(capacity)} capacidad total` },
  ];
}

function makeTrends(catalog?: Catalog) {
  const labels = [
    ...(catalog?.appTypes ?? []).slice(0, 3).map((type) => ({ label: type.name, type: "App", score: 72 + type.difficulty * 4 })),
    ...(catalog?.technologies ?? []).slice(0, 4).map((tech, index) => ({ label: tech.name, type: "Tech", score: 86 - index * 7 })),
  ];
  return labels.slice(0, 7);
}

function makeObjectives(company?: Company) {
  return [
    { label: "Llegar a 100 usuarios activos", current: company?.activeUsers ?? 0, target: 100, scope: "Diario" },
    { label: "Publicar 5 features", current: company?.modules.length ?? 0, target: 5, scope: "Semanal" },
    { label: "Mantener rating 4.5", current: Math.round((company?.rating ?? 0) * 20), target: 90, scope: "Largo plazo" },
  ];
}

function makeNpcCompanies(company?: Company) {
  const base = company?.valuation ?? 3000;
  return ["NovaSoft", "ByteCart", "CloudFox", "RocketCRM", "LoopAI", "CacheWorks"].map((name, index) => ({
    name,
    valuation: Math.max(500, Math.round(base * (1.35 - index * 0.12))),
    users: Math.max(50, Math.round((company?.activeUsers ?? 200) * (1.4 - index * 0.11))),
  }));
}

function makeVersions(company: Company) {
  return [
    {
      version: `v${Math.max(1, company.modules.length)}.0`,
      date: "Actual",
      notes: [
        `${company.modules.length} funciones instaladas`,
        `${company.development.length} tareas en sprint`,
        `Rating ${company.rating.toFixed(1)} con ${format(company.activeUsers)} usuarios`,
      ],
    },
    {
      version: "v0.1",
      date: "Fundacion",
      notes: ["Blueprint inicial copiado", "Infraestructura base creada", "Primer equipo contratado"],
    },
  ];
}
