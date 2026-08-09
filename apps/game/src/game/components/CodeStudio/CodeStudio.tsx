"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sileo } from "sileo";
import {
  createCodeStudioCompany,
  fixCodeStudioBug,
  getCodeStudio,
  getCodeStudioRanking,
  hireCodeStudioEmployee,
  installCodeStudioInfrastructure,
  launchCodeStudioCampaign,
  startCodeStudioDevelopment,
  unlockCodeStudioTechnology,
} from "../../network/codestudio";
import "./CodeStudio.css";
import { BacklogPriority, GuideKey, StudioState, ViewKey, nav } from "./types";
import {
  makeClients,
  makeNotifications,
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
import RankingView, { RankingRow } from "./views/RankingView";
import SettingsView from "./views/SettingsView";
import ModuleLibrary from "./views/ModuleLibrary";
import FoundingWizard from "./wizard/FoundingWizard";
import ExplainerTour from "./wizard/ExplainerTour";
import SidebarTour from "./SidebarTour";
import { useTranslation } from "../../../i18n/useTranslation";

const SIDEBAR_TOUR_SEEN_KEY = "cs-sidebar-tour-seen";

export default function CodeStudio() {
  const t = useTranslation();
  const [state, setState] = useState<StudioState | null>(null);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [activeGuide, setActiveGuide] = useState<GuideKey | null>(null);
  const [showSidebarTour, setShowSidebarTour] = useState(false);
  const [view, setView] = useState<ViewKey>("dashboard");
  const [moduleSearch, setModuleSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [priority, setPriority] = useState<Record<string, BacklogPriority>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Guarda, por empresa, el status de cada tarea de desarrollo vista en el
  // ultimo load(). El backend nunca borra tareas COMPLETED del array (quedan
  // como historial), asi que la unica forma de detectar "esto se termino
  // recien" es comparar status anterior vs nuevo, no solo si sigue presente.
  const previousTaskStatusRef = useRef<Record<string, Record<string, string>>>({});
  // Igual que previousTaskStatusRef pero para el evento mas reciente de cada
  // empresa: si cambia de id Y tiene effects.marketEvent, es un evento de
  // mercado real recien roleado (ver simulateCompany en codestudio.service.ts)
  // y merece un toast, no solo aparecer silencioso en el feed.
  const previousLatestEventIdRef = useRef<Record<string, string>>({});

  const load = async () => {
    setError("");
    // El ranking es informativo (no bloquea al jugador si por lo que sea
    // falla), asi que se pide aparte y no aborta el load principal.
    void getCodeStudioRanking()
      .then(setRanking)
      .catch((err) => console.error("No se pudo cargar el ranking de CodeStudio:", err));
    try {
      const data = await getCodeStudio();
      const previousByCompany = previousTaskStatusRef.current;
      const nextByCompany: Record<string, Record<string, string>> = {};
      for (const company of data.companies ?? []) {
        const previousTasks = previousByCompany[company.id] ?? {};
        nextByCompany[company.id] = {};
        for (const task of company.development) {
          nextByCompany[company.id][task.id] = task.status;
          const wasActive = previousTasks[task.id] === "QUEUED" || previousTasks[task.id] === "IN_PROGRESS";
          if (wasActive && task.status === "COMPLETED") {
            sileo.success({
              title: t("codestudioGeneral.notifications.featureReadyTitle"),
              description: t("codestudioGeneral.notifications.featureReadyDescription", {
                name: task.module.name,
                company: company.name,
              }),
            });
          }
        }

        const latestEvent = company.events?.[0];
        const previousLatestEventId = previousLatestEventIdRef.current[company.id];
        if (latestEvent) {
          if (previousLatestEventId && previousLatestEventId !== latestEvent.id && latestEvent.effects?.marketEvent) {
            sileo.info({ title: latestEvent.title, description: latestEvent.description ?? undefined });
          }
          previousLatestEventIdRef.current[company.id] = latestEvent.id;
        }
      }
      previousTaskStatusRef.current = nextByCompany;
      setState(data);
      setSelectedCompanyId((current) => current || data.companies?.[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("codestudioGeneral.errors.loadFailed"));
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
  // Cadena por categoria (ver seed-codestudio.ts): una feature exige tener
  // ya INSTALADA (no solo en desarrollo) la anterior de su misma categoria.
  // Backlog/Roadmap/ModuleLibrary usan esto para mostrar el candado y el
  // backend (startDevelopment) valida lo mismo del lado servidor.
  const installedModuleSlugs = new Set(selectedCompany?.modules.map((entry) => entry.module.slug) ?? []);
  const moduleNameBySlug = Object.fromEntries((state?.catalog.modules ?? []).map((module) => [module.slug, module.name]));

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
  const clients = useMemo(() => makeClients(selectedCompany), [selectedCompany]);
  const trends = useMemo(() => makeTrends(state?.catalog), [state?.catalog]);
  const objectives = useMemo(() => makeObjectives(selectedCompany), [selectedCompany]);

  // La llama FoundingWizard al final del ultimo paso — se mantiene toda la
  // logica de red/recarga/seleccion que ya existia, el wizard solo decide
  // CUANDO se llama (recien al confirmar el ultimo paso) y con que datos.
  const handleFoundCompany = async (appTypeId: string, name: string) => {
    const company = await createCodeStudioCompany(appTypeId, name);
    await load();
    setSelectedCompanyId(company.id);
    setView("dashboard");
    setShowWizard(false);
    // Tour real de la barra lateral (apunta a botones de verdad, no un
    // modal centrado) — se muestra solo una vez por navegador, la primera
    // vez que alguien funda una empresa. "Ver tour" en el header lo vuelve
    // a disparar cuando quieran.
    try {
      if (!window.localStorage.getItem(SIDEBAR_TOUR_SEEN_KEY)) setShowSidebarTour(true);
    } catch {
      setShowSidebarTour(true);
    }
  };

  const finishSidebarTour = () => {
    setShowSidebarTour(false);
    try {
      window.localStorage.setItem(SIDEBAR_TOUR_SEEN_KEY, "1");
    } catch {
      // localStorage puede fallar (privado/bloqueado) — no es critico, el
      // tour simplemente se ofreceria de nuevo la proxima vez.
    }
  };

  const develop = async (moduleId: string) => {
    if (!selectedCompany) return;
    await startCodeStudioDevelopment(selectedCompany.id, moduleId);
    await load();
    setView("development");
  };

  const hireEmployee = async (employeeTypeId: string) => {
    if (!selectedCompany) return;
    try {
      await hireCodeStudioEmployee(selectedCompany.id, employeeTypeId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("codestudioGeneral.errors.hireFailed"));
    }
  };

  const fixBug = async (bugId: string, method: "cash" | "employee", employeeId?: string) => {
    if (!selectedCompany) return;
    try {
      await fixCodeStudioBug(selectedCompany.id, bugId, method, employeeId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("codestudioGeneral.errors.fixBugFailed"));
    }
  };

  const installInfrastructure = async (infrastructureTypeId: string) => {
    if (!selectedCompany) return;
    try {
      await installCodeStudioInfrastructure(selectedCompany.id, infrastructureTypeId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("codestudioGeneral.errors.installFailed"));
    }
  };

  const launchCampaign = async (campaignId: string) => {
    if (!selectedCompany) return;
    try {
      await launchCodeStudioCampaign(selectedCompany.id, campaignId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("codestudioGeneral.errors.launchCampaignFailed"));
    }
  };

  const unlockTechnology = async (technologyId: string) => {
    if (!selectedCompany) return;
    try {
      await unlockCodeStudioTechnology(selectedCompany.id, technologyId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("codestudioGeneral.errors.unlockTechnologyFailed"));
    }
  };

  // DeleteCompanyModal ya confirmó el borrado en el backend antes de llamar
  // esto — acá solo hace falta soltar la selección ANTES de recargar (si no,
  // el "current ||" de load() se queda con el id viejo, que ya no existe).
  const handleCompanyDeleted = async () => {
    setSelectedCompanyId("");
    await load();
    setView("dashboard");
  };

  // TutorialPanel llama esto para "Elegí tu primera feature" / "Contratá" /
  // "Instalá infra" — el jugador reportó que llegar directo a esas pantallas
  // no le alcanzaba para entender qué hacer, así que además de cambiar de
  // vista mostramos una guía corta (ExplainerTour) que explica el concepto
  // antes de dejarlo interactuar solo con la pantalla real.
  const handleGuidedNavigate = (nextView: ViewKey, guideKey?: GuideKey) => {
    setView(nextView);
    if (guideKey) setActiveGuide(guideKey);
  };

  const featureGuideSlides = [
    {
      title: t("codestudioMisc.guides.feature.step1Title"),
      description: t("codestudioMisc.guides.feature.step1Description"),
    },
    {
      title: t("codestudioMisc.guides.feature.step2Title"),
      description: t("codestudioMisc.guides.feature.step2Description"),
    },
    {
      title: t("codestudioMisc.guides.feature.step3Title"),
      description: t("codestudioMisc.guides.feature.step3Description"),
    },
  ];

  const hireGuideSlides = [
    {
      title: t("codestudioMisc.guides.hire.step1Title"),
      description: t("codestudioMisc.guides.hire.step1Description"),
    },
    {
      title: t("codestudioMisc.guides.hire.step2Title"),
      description: t("codestudioMisc.guides.hire.step2Description"),
    },
  ];

  const infraGuideSlides = [
    {
      title: t("codestudioMisc.guides.infra.step1Title"),
      description: t("codestudioMisc.guides.infra.step1Description"),
    },
    {
      title: t("codestudioMisc.guides.infra.step2Title"),
      description: t("codestudioMisc.guides.infra.step2Description"),
    },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading && !state) {
    return <div className="codestudio-shell codestudio-loading">{t("codestudioGeneral.shell.loading")}</div>;
  }

  return (
    <div className={`codestudio-shell ${showWizard ? "wizard-locked" : ""}`}>
      <header className="cs-app-header">
        <div>
          <span className="codestudio-chip">{t("codestudioGeneral.header.phaseChip")}</span>
          <h2>{selectedCompany ? selectedCompany.name : t("codestudioGeneral.header.newStudio")}</h2>
          <p>{selectedCompany ? `${selectedCompany.appType.name} · ${selectedCompany.status}` : t("codestudioGeneral.header.createStartupHint")}</p>
        </div>
        <div className="cs-actions">
          <span className="cs-live-indicator"><i /> {t("codestudioGeneral.header.liveTicks")}</span>
          <button onClick={() => setShowSidebarTour(true)} disabled={showWizard || !selectedCompany}>
            {t("codestudioGeneral.header.tourButton")}
          </button>
          <button onClick={() => void load()} disabled={showWizard}>{t("codestudioGeneral.header.sync")}</button>
        </div>
      </header>

      <aside className="cs-sidebar">
        <div className="cs-brand">
          <span>CB</span>
          <div>
            <b>CodeStudio</b>
            <small>{t("codestudioGeneral.sidebar.tagline")}</small>
          </div>
        </div>

        <div className="cs-company-switcher">
          <label>{t("codestudioGeneral.sidebar.activeCompanyLabel")}</label>
          <select
            value={selectedCompanyId}
            onChange={(event) => setSelectedCompanyId(event.target.value)}
            disabled={showWizard}
          >
            {state?.companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <button className="cs-new-company-btn" onClick={() => setShowWizard(true)} disabled={showWizard}>
          {t("codestudioGeneral.wizard.newCompanyButton")}
        </button>

        <nav className="cs-nav">
          {nav.map((item) => (
            <button
              key={item.key}
              id={`cs-nav-${item.key}`}
              className={view === item.key ? "active" : ""}
              onClick={() => setView(item.key)}
              disabled={showWizard}
            >
              <span>
                <item.icon size={16} />
              </span>
              {t(item.labelKey)}
            </button>
          ))}
        </nav>
      </aside>

      <main className="cs-workspace">
        {error && <div className="codestudio-error">{error}</div>}

        {!selectedCompany ? (
          <section className="cs-empty-state">
            <b>{t("codestudioGeneral.emptyState.title")}</b>
            <p>{t("codestudioGeneral.emptyState.description")}</p>
            <button className="cs-empty-state-cta" onClick={() => setShowWizard(true)}>
              {t("codestudioGeneral.wizard.foundFirstButton")}
            </button>
          </section>
        ) : (
          <section className="cs-view">
            {view === "dashboard" && (
              <DashboardView
                company={selectedCompany}
                notifications={notifications}
                objectives={objectives}
                trends={trends}
                onNavigate={handleGuidedNavigate}
              />
            )}
            {view === "company" && <CompanyView company={selectedCompany} />}
            {view === "apps" && <AppTreeView company={selectedCompany} />}
            {view === "development" && (
              <DevelopmentView company={selectedCompany} onNavigate={handleGuidedNavigate} onFixBug={fixBug} />
            )}
            {view === "roadmap" && (
              <RoadmapView
                company={selectedCompany}
                availableModules={availableModules}
                installedModuleSlugs={installedModuleSlugs}
                moduleNameBySlug={moduleNameBySlug}
                onDevelop={develop}
              />
            )}
            {view === "backlog" && (
              <BacklogView
                modules={availableModules}
                priority={priority}
                setPriority={setPriority}
                installedModuleSlugs={installedModuleSlugs}
                moduleNameBySlug={moduleNameBySlug}
                onDevelop={develop}
              />
            )}
            {view === "employees" && (
              <EmployeesLiveView
                company={selectedCompany}
                catalog={state?.catalog}
                onHire={hireEmployee}
                onNavigate={handleGuidedNavigate}
              />
            )}
            {view === "clients" && <ClientsView clients={clients} bugReports={selectedCompany.bugReports} />}
            {view === "marketing" && (
              <MarketingView catalog={state?.catalog} company={selectedCompany} onLaunch={launchCampaign} />
            )}
            {view === "infrastructure" && (
              <InfrastructureView
                company={selectedCompany}
                catalog={state?.catalog}
                onInstall={installInfrastructure}
                onNavigate={handleGuidedNavigate}
              />
            )}
            {view === "research" && (
              <ResearchView catalog={state?.catalog} trends={trends} company={selectedCompany} onUnlock={unlockTechnology} />
            )}
            {view === "finance" && <FinanceView company={selectedCompany} />}
            {view === "analytics" && <AnalyticsView company={selectedCompany} />}
            {view === "ranking" && <RankingView company={selectedCompany} ranking={ranking} />}
            {view === "settings" && (
              <SettingsView company={selectedCompany} onCompanyDeleted={() => void handleCompanyDeleted()} />
            )}

            {["roadmap", "backlog", "apps"].includes(view) && (
              <ModuleLibrary
                groupedModules={groupedModules}
                expanded={expanded}
                setExpanded={setExpanded}
                moduleSearch={moduleSearch}
                setModuleSearch={setModuleSearch}
                installedModuleSlugs={installedModuleSlugs}
                moduleNameBySlug={moduleNameBySlug}
                onDevelop={develop}
              />
            )}
          </section>
        )}
      </main>

      <footer className="cs-footer">
        <span>{t("codestudioGeneral.footer.engine")}</span>
        <span>{t("codestudioGeneral.footer.objective", { label: objectives[0]?.label ?? t("codestudioGeneral.footer.objectiveFallback") })}</span>
        <span>{t("codestudioGeneral.footer.activity", { title: notifications[0]?.title ?? t("codestudioGeneral.footer.activityFallback") })}</span>
      </footer>

      {showWizard && (
        <FoundingWizard
          appTypes={state?.catalog.appTypes ?? []}
          onFound={handleFoundCompany}
          onCancel={() => setShowWizard(false)}
        />
      )}

      {activeGuide === "feature" && (
        <ExplainerTour slides={featureGuideSlides} onFinish={() => setActiveGuide(null)} />
      )}
      {activeGuide === "hire" && <ExplainerTour slides={hireGuideSlides} onFinish={() => setActiveGuide(null)} />}
      {activeGuide === "infra" && <ExplainerTour slides={infraGuideSlides} onFinish={() => setActiveGuide(null)} />}

      <SidebarTour run={showSidebarTour} onFinish={finishSidebarTour} />
    </div>
  );
}
