"use client";

import { AlertTriangle, ArrowRight, Check, Flag, Gift, Lock, Scale } from "lucide-react";
import type { Catalog, CompanyView, ViewKey } from "./types";
import { ProgressBar, Sparkline, Stat, goalProgress, goalValue, money, nextStep, num, pct } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

type Props = {
  company: CompanyView;
  catalog: Catalog;
  onNavigate: (view: ViewKey) => void;
  onOpenDecision: () => void;
};

export default function PanelView({ company, catalog, onNavigate, onOpenDecision }: Props) {
  const t = useTranslation();
  const m = company.metrics;
  const step = nextStep(company, catalog, t);
  const profitTone = m.dailyProfit >= 0 ? "good" : "bad";

  return (
    <div className="cs2-stack">
      {/* Camino: las etapas de la startup, siempre a la vista. */}
      <section className="cs2-card">
        <div className="cs2-path" aria-label={t("codestudio.panel.pathLabel")}>
          {catalog.stages.map((stage) => {
            const state = stage.index < company.stage.index ? "done" : stage.index === company.stage.index ? "current" : "todo";
            return (
              <div key={stage.index} className={`cs2-path-step ${state}`}>
                <i>{state === "done" ? <Check size={12} /> : state === "todo" ? <Lock size={11} /> : stage.index + 1}</i>
                <span>{stage.name}</span>
              </div>
            );
          })}
        </div>

        <div className="cs2-stage">
          <div>
            <span className="cs2-eyebrow">
              <Flag size={13} /> {t("codestudio.panel.stageLabel", { index: company.stage.index + 1, total: catalog.stages.length })}
            </span>
            <h3>{company.stage.name}</h3>
            <p>{company.stage.tagline}</p>
          </div>
          {company.stage.next && (
            <div className="cs2-reward">
              <Gift size={16} />
              <div>
                <small>{t("codestudio.panel.nextReward", { name: company.stage.next.name })}</small>
                <b>
                  {[
                    company.stage.next.reward.cash > 0 ? money(company.stage.next.reward.cash) : null,
                    `${company.stage.next.reward.xp} XP`,
                    company.stage.next.reward.coins > 0 ? t("codestudio.common.coins", { count: company.stage.next.reward.coins }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </b>
              </div>
            </div>
          )}
        </div>

        {company.stage.goals.length > 0 && (
          <div className="cs2-goals">
            {company.stage.goals.map((goal) => (
              <div key={goal.label} className={`cs2-goal ${goal.met ? "met" : ""}`}>
                <div>
                  <span>{goal.met ? <Check size={13} /> : null} {goal.label}</span>
                  <b>
                    {goalValue(goal, goal.current)} {goal.kind === "min" ? "≤" : "/"} {goalValue(goal, goal.target)}
                  </b>
                </div>
                <ProgressBar value={goalProgress(goal)} tone={goal.met ? "good" : "accent"} />
              </div>
            ))}
          </div>
        )}
      </section>

      <button type="button" className={`cs2-next cs2-next-${step.tone}`} onClick={() => (company.pendingDecision ? onOpenDecision() : onNavigate(step.view))}>
        <span>{t("codestudio.panel.whatNow")}</span>
        <b>{step.text}</b>
        <ArrowRight size={18} />
      </button>

      {company.pendingDecision && (
        <section className="cs2-card cs2-decision-teaser">
          <Scale size={18} />
          <div>
            <b>{company.pendingDecision.title}</b>
            <p>{t("codestudio.panel.decisionExpires", { days: company.pendingDecision.daysLeft.toFixed(1) })}</p>
          </div>
          <button type="button" className="cs2-btn" onClick={onOpenDecision}>
            {t("codestudio.panel.decide")}
          </button>
        </section>
      )}

      {company.daysUntilBankruptcy !== null && (
        <section className="cs2-alert cs2-alert-bad">
          <AlertTriangle size={18} />
          <p>{t("codestudio.panel.debtAlert", { days: company.daysUntilBankruptcy.toFixed(1) })}</p>
        </section>
      )}

      <section className="cs2-stats">
        <Stat
          label={t("codestudio.kpi.cash")}
          value={money(company.cash)}
          tone={company.cash < 0 ? "bad" : m.runwayDays !== null && m.runwayDays < 10 ? "warn" : undefined}
          hint={m.runwayDays !== null ? t("codestudio.kpi.runway", { days: Math.floor(m.runwayDays) }) : t("codestudio.kpi.profitable")}
        />
        <Stat
          label={t("codestudio.kpi.users")}
          value={num(company.activeUsers)}
          hint={t("codestudio.kpi.usersFlow", { plus: num(m.dailyNewUsers), minus: num(m.dailyLostUsers) })}
        />
        <Stat
          label={t("codestudio.kpi.profit")}
          value={money(m.dailyProfit)}
          tone={profitTone}
          hint={t("codestudio.kpi.profitHint", { revenue: money(m.dailyRevenue), costs: money(m.dailyCosts) })}
        />
        <Stat
          label={t("codestudio.kpi.rating")}
          value={`★ ${company.rating.toFixed(1)}`}
          tone={company.rating < 3 ? "bad" : company.rating >= 4 ? "good" : undefined}
          hint={t("codestudio.kpi.satisfaction", { value: Math.round(company.satisfaction) })}
        />
        <Stat
          label={t("codestudio.kpi.churn")}
          value={pct(m.churn, 1)}
          tone={m.churn > 0.04 ? "bad" : m.churn < 0.02 ? "good" : undefined}
          hint={t("codestudio.kpi.churnHint")}
        />
        <Stat
          label={t("codestudio.kpi.valuation")}
          value={money(company.valuation)}
          hint={t("codestudio.kpi.equity", { value: company.founderEquity.toFixed(1) })}
        />
      </section>

      <section className="cs2-grid-2">
        <div className="cs2-card">
          <Sparkline values={company.snapshots.map((snapshot) => snapshot.activeUsers)} label={t("codestudio.panel.chartUsers")} />
          <Sparkline
            values={company.snapshots.map((snapshot) => snapshot.revenue - snapshot.expenses)}
            label={t("codestudio.panel.chartProfit")}
            tone={profitTone}
          />
        </div>
        <div className="cs2-card">
          <h4>{t("codestudio.panel.activity")}</h4>
          <ul className="cs2-feed">
            {company.events.slice(0, 8).map((event) => (
              <li key={event.id} className={`cs2-tone-${event.tone}`}>
                <b>{event.title}</b>
                {event.description && <p>{event.description}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
