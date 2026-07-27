"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createCodeStudioCompany,
  getCodeStudio,
  startCodeStudioDevelopment,
} from "../../network/codestudio";
import "./CodeStudio.css";
import { BacklogPriority, StudioState, ViewKey, nav } from "./types";
import {
  makeBugs,
  makeClients,
  makeNotifications,
  makeNpcCompanies,
  makeObjectives,
  makeTrends,
} from "./mockData";
import DashboardView from "./views/DashboardView";
import CompanyView from "./views/CompanyView";
import AppTreeView from "./views/AppTreeView";
import DevelopmentView from "./views/DevelopmentView";
import RoadmapView from "./views/RoadmapView";
import BacklogView from "./views/BacklogView";
import EmployeesLiveView from "./views/EmployeesLiveView";
import ClientsView from "./views/ClientsView";
import MarketingView from "./views/MarketingView";
import InfrastructureView from "./views/InfrastructureView";
import ResearchView from "./views/ResearchView";
import FinanceView from "./views/FinanceView";
import AnalyticsView from "./views/AnalyticsView";
import RankingView from "./views/RankingView";
import SettingsView from "./views/SettingsView";
import ModuleLibrary from "./views/ModuleLibrary";

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
