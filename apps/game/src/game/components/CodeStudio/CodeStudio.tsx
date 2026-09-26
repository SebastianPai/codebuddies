"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sileo } from "sileo";
import { Award, CalendarDays, Plus, Rocket, Wallet } from "lucide-react";
import {
  cancelCodeStudioDevelopment,
  chooseCodeStudioDecision,
  createCodeStudioCompany,
  fireCodeStudioEmployee,
  fixCodeStudioBug,
  getCodeStudio,
  getCodeStudioCompany,
  hireCodeStudioEmployee,
  installCodeStudioInfrastructure,
  launchCodeStudioCampaign,
  raiseCodeStudioFunding,
  setCodeStudioPricing,
  startCodeStudioDevelopment,
} from "../../network/codestudio";
import "./CodeStudio.css";
import { nav, type ActivityEvent, type BugFixResult, type CompanyView, type StudioState, type ViewKey } from "./types";
import { ProgressBar, money } from "./ui";
import PanelView from "./PanelView";
import TreeView from "./TreeView";
import BugsView from "./BugsView";
import TeamView from "./TeamView";
import InfraView from "./InfraView";
import MarketingView from "./MarketingView";
import FinanceView from "./FinanceView";
import CareerView from "./CareerView";
import RankingView from "./RankingView";
import SettingsView from "./SettingsView";
import FailedView from "./FailedView";
import FoundingModal from "./FoundingModal";
import DecisionModal from "./DecisionModal";
import { useTranslation } from "../../../i18n/useTranslation";

const POLL_MS = 10_000;
const SELECTED_KEY = "cs-selected-company";
// Eventos que merecen un toast al aparecer (el resto solo va al feed).
const TOAST_KINDS = new Set(["milestone", "stage", "level-up", "bug", "market", "release", "failure", "bug-fixed"]);

function readSelected() {
  try {
    return window.localStorage.getItem(SELECTED_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveSelected(id: string) {
  try {
    window.localStorage.setItem(SELECTED_KEY, id);
  } catch {
    // Sin storage (modo privado): solo se pierde la preferencia.
  }
}

export default function CodeStudio() {
  const t = useTranslation();
  const [studio, setStudio] = useState<StudioState | null>(null);
  const [company, setCompany] = useState<CompanyView | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<ViewKey>("panel");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showFound, setShowFound] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const seenEventsRef = useRef<Map<string, Set<string>>>(new Map());
  const pollingRef = useRef(false);

  const toastNewEvents = useCallback((next: CompanyView) => {
    const seen = seenEventsRef.current.get(next.id);
    const ids = new Set(next.events.map((event) => event.id));
    seenEventsRef.current.set(next.id, ids);
    if (!seen) return; // primera carga: no spamear con el historial
    const fresh = next.events.filter((event) => !seen.has(event.id) && TOAST_KINDS.has(event.kind)).slice(0, 3).reverse();
    for (const event of fresh) toast(event);
  }, []);

  const applyCompany = useCallback(
    (next: CompanyView) => {
      toastNewEvents(next);
      setCompany(next);
      setStudio((current) =>
        current
          ? {
              ...current,
              profile: next.profile,
              companies: current.companies.map((entry) =>
                entry.id === next.id ? { ...entry, status: next.status, stage: next.stage.index, cash: next.cash, valuation: next.valuation } : entry,
              ),
            }
          : current,
      );
    },
    [toastNewEvents],
  );

  const loadStudio = useCallback(async (preferId?: string) => {
    try {
      const data = await getCodeStudio();
      setStudio(data);
      const remembered = preferId ?? readSelected();
      const pick =
        data.companies.find((entry) => entry.id === remembered) ??
        data.companies.find((entry) => entry.status !== "FAILED") ??
        data.companies[0];
      setSelectedId(pick?.id ?? "");
      if (!pick) setCompany(null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void loadStudio();
  }, [loadStudio]);

  // Poll de la empresa abierta: cada llamada avanza la simulación en el
  // servidor. Se pausa si la pestaña no está visible (ahorra servidor y la
  // empresa queda "en pausa" mientras no miras).
  useEffect(() => {
    if (!selectedId) return;
    saveSelected(selectedId);
    let cancelled = false;
    const tick = async () => {
      if (pollingRef.current || (typeof document !== "undefined" && document.visibilityState === "hidden")) return;
      pollingRef.current = true;
      try {
        const next = await getCodeStudioCompany(selectedId);
        if (!cancelled) applyCompany(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        pollingRef.current = false;
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [selectedId, applyCompany]);

  // Abre la decisión sola la primera vez que aparece.
  const lastDecisionRef = useRef<string | null>(null);
  useEffect(() => {
    const id = company?.pendingDecision?.id ?? null;
    if (id && id !== lastDecisionRef.current) setShowDecision(true);
    lastDecisionRef.current = id;
  }, [company?.pendingDecision?.id]);

  const act = async (run: () => Promise<CompanyView>) => {
    setBusy(true);
    try {
      applyCompany(await run());
    } catch (err) {
      sileo.error({ title: t("codestudio.errors.actionFailed"), description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  const fixBug = async (bugId: string, body: Parameters<typeof fixCodeStudioBug>[2]): Promise<BugFixResult | null> => {
    if (!company) return null;
    setBusy(true);
    try {
      const response = await fixCodeStudioBug(company.id, bugId, body);
      applyCompany(response.company);
      return response.result;
    } catch (err) {
      sileo.error({ title: t("codestudio.errors.actionFailed"), description: err instanceof Error ? err.message : String(err) });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const found = async (appTypeId: string, name: string) => {
    const created = await createCodeStudioCompany(appTypeId, name);
    setShowFound(false);
    setView("tree");
    seenEventsRef.current.delete(created.id);
    await loadStudio(created.id);
    applyCompany(created);
  };

  if (!studio) {
    return <div className="cs2-shell cs2-loading">{error || t("codestudio.common.loading")}</div>;
  }

  const profile = company?.profile ?? studio.profile;
  const levelSpan = Math.max(1, profile.nextLevelXp - profile.levelXp);
  const failed = company?.status === "FAILED";
  const failedAllowed: ViewKey[] = ["career", "ranking", "settings"];

  return (
    <div className="cs2-shell">
      <header className="cs2-header">
        <div className="cs2-brand">
          <span>CS</span>
          <select
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setView("panel");
            }}
            aria-label={t("codestudio.header.company")}
            disabled={studio.companies.length === 0}
          >
            {studio.companies.length === 0 && <option value="">{t("codestudio.header.noCompany")}</option>}
            {studio.companies.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
                {entry.status === "FAILED" ? ` (${t("codestudio.header.failed")})` : ""}
              </option>
            ))}
          </select>
          <button type="button" className="cs2-icon-btn" onClick={() => setShowFound(true)} aria-label={t("codestudio.header.newCompany")} title={t("codestudio.header.newCompany")}>
            <Plus size={16} />
          </button>
        </div>

        {company && (
          <div className="cs2-header-stats">
            <span title={t("codestudio.header.dayHint")}>
              <CalendarDays size={14} /> {t("codestudio.header.day", { day: Math.floor(company.gameDays) + 1 })}
            </span>
            <span className={company.cash < 0 ? "cs2-tone-bad" : ""}>
              <Wallet size={14} /> {money(company.cash)}
            </span>
            <span className="cs2-stage-chip">{company.stage.name}</span>
          </div>
        )}

        <button type="button" className="cs2-level-chip" onClick={() => setView("career")} title={t("codestudio.header.levelHint")}>
          <Award size={15} />
          <span>{t("codestudio.header.level", { level: profile.level })}</span>
          <ProgressBar value={((profile.xp - profile.levelXp) / levelSpan) * 100} />
        </button>
      </header>

      {company && (
        <nav className="cs2-nav" aria-label={t("codestudio.header.navigation")}>
          {nav.map((item) => {
            const badge = item.key === "bugs" ? company.bugs.length : item.key === "panel" && company.pendingDecision ? 1 : 0;
            return (
              <button key={item.key} type="button" className={view === item.key ? "active" : ""} onClick={() => setView(item.key)}>
                <item.icon size={16} />
                <span>{t(item.labelKey)}</span>
                {badge > 0 && <em>{badge}</em>}
              </button>
            );
          })}
        </nav>
      )}

      <main className="cs2-main">
        {error && <p className="cs2-alert cs2-alert-bad">{error}</p>}

        {!company ? (
          studio.companies.length === 0 ? (
            <section className="cs2-card cs2-welcome">
              <Rocket size={34} />
              <h2>{t("codestudio.welcome.title")}</h2>
              <p>{t("codestudio.welcome.text")}</p>
              <ol>
                <li>{t("codestudio.welcome.step1")}</li>
                <li>{t("codestudio.welcome.step2")}</li>
                <li>{t("codestudio.welcome.step3")}</li>
                <li>{t("codestudio.welcome.step4")}</li>
              </ol>
              <button type="button" className="cs2-btn cs2-btn-primary" onClick={() => setShowFound(true)}>
                <Rocket size={15} /> {t("codestudio.welcome.cta")}
              </button>
            </section>
          ) : (
            <p className="cs2-muted">{t("codestudio.common.loading")}</p>
          )
        ) : failed && !failedAllowed.includes(view) ? (
          <FailedView company={company} onFoundNew={() => setShowFound(true)} />
        ) : (
          <>
            {view === "panel" && <PanelView company={company} catalog={studio.catalog} onNavigate={setView} onOpenDecision={() => setShowDecision(true)} />}
            {view === "tree" && (
              <TreeView
                company={company}
                catalog={studio.catalog}
                busy={busy}
                onBuild={(featureId) => void act(() => startCodeStudioDevelopment(company.id, featureId))}
                onCancel={(taskId) => void act(() => cancelCodeStudioDevelopment(company.id, taskId))}
              />
            )}
            {view === "bugs" && <BugsView company={company} busy={busy} onFix={fixBug} />}
            {view === "team" && (
              <TeamView
                company={company}
                catalog={studio.catalog}
                busy={busy}
                onHire={(roleId) => void act(() => hireCodeStudioEmployee(company.id, roleId))}
                onFire={(employeeId) => void act(() => fireCodeStudioEmployee(company.id, employeeId))}
              />
            )}
            {view === "infra" && (
              <InfraView company={company} catalog={studio.catalog} busy={busy} onInstall={(typeId) => void act(() => installCodeStudioInfrastructure(company.id, typeId))} />
            )}
            {view === "marketing" && (
              <MarketingView
                company={company}
                catalog={studio.catalog}
                busy={busy}
                onLaunch={(campaignId, multiplier) => void act(() => launchCodeStudioCampaign(company.id, campaignId, multiplier))}
              />
            )}
            {view === "finance" && (
              <FinanceView
                company={company}
                catalog={studio.catalog}
                busy={busy}
                onPricing={(level) => void act(() => setCodeStudioPricing(company.id, level))}
                onFunding={() => void act(() => raiseCodeStudioFunding(company.id))}
              />
            )}
            {view === "career" && <CareerView profile={profile} catalog={studio.catalog} />}
            {view === "ranking" && <RankingView companyId={company.id} catalog={studio.catalog} />}
            {view === "settings" && (
              <SettingsView
                company={company}
                onDeleted={() => {
                  setCompany(null);
                  setView("panel");
                  void loadStudio("");
                }}
              />
            )}
          </>
        )}
      </main>

      {showFound && <FoundingModal catalog={studio.catalog} profile={profile} onFound={found} onClose={() => setShowFound(false)} />}
      {showDecision && company?.pendingDecision && !failed && (
        <DecisionModal
          decision={company.pendingDecision}
          busy={busy}
          onClose={() => setShowDecision(false)}
          onChoose={(choice) => {
            setShowDecision(false);
            void act(() => chooseCodeStudioDecision(company.id, company.pendingDecision!.id, choice));
          }}
        />
      )}
    </div>
  );
}

function toast(event: ActivityEvent) {
  const payload = { title: event.title, description: event.description ?? undefined };
  if (event.tone === "good") sileo.success(payload);
  else if (event.tone === "bad") sileo.warning(payload);
  else sileo.info(payload);
}
