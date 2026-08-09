"use client";

import { Company, ViewKey } from "./types";
import { format, percent } from "./utils";
import { makeNotifications } from "./mockData";
import { useTranslation } from "../../../i18n/useTranslation";

export function Kpis({ company }: { company: Company }) {
  const t = useTranslation();
  const kpis = [
    [t("codestudioGeneral.widgets.kpis.company"), `$${format(company.valuation)}`, t("codestudioGeneral.widgets.kpis.value")],
    [
      t("codestudioGeneral.widgets.kpis.users"),
      format(company.activeUsers),
      t("codestudioGeneral.widgets.kpis.totalUsersHint", { total: format(company.totalUsers) }),
    ],
    [
      t("codestudioGeneral.widgets.kpis.revenue"),
      `$${format(company.revenue)}`,
      t("codestudioGeneral.widgets.kpis.expensesHint", { expenses: format(company.expenses) }),
    ],
    [
      t("codestudioGeneral.widgets.kpis.rating"),
      company.rating.toFixed(1),
      t("codestudioGeneral.widgets.kpis.satisfactionHint", { percent: percent(company.satisfaction) }),
    ],
    [
      t("codestudioGeneral.widgets.kpis.employees"),
      String(company.employees.length),
      t("codestudioGeneral.widgets.kpis.activeTeamHint"),
    ],
    [
      t("codestudioGeneral.widgets.kpis.infra"),
      `${percent(company.stability)}`,
      t("codestudioGeneral.widgets.kpis.latencyHint", { latency: company.latency.toFixed(0) }),
    ],
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

export function ActivityTimeline({ notifications }: { notifications: ReturnType<typeof makeNotifications> }) {
  const t = useTranslation();
  const now = Date.now();
  return (
    <div className="cs-timeline">
      <div className="cs-panel-header">
        <div>
          <h3>{t("codestudioGeneral.widgets.timeline.title")}</h3>
          <p>{t("codestudioGeneral.widgets.timeline.subtitle")}</p>
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

export function ActionBriefing({
  company,
  notifications,
  onNavigate,
}: {
  company: Company;
  notifications: ReturnType<typeof makeNotifications>;
  onNavigate: (view: ViewKey) => void;
}) {
  const t = useTranslation();
  const overloaded = company.latency > 180 || company.stability < 95;
  const hasActiveSprint = company.development.some((task) => ["QUEUED", "IN_PROGRESS"].includes(task.status));
  const nextView: ViewKey = overloaded ? "infrastructure" : hasActiveSprint ? "development" : "roadmap";
  const nextLabel = overloaded
    ? t("codestudioGeneral.widgets.briefing.scaleInfrastructure")
    : hasActiveSprint
      ? t("codestudioGeneral.widgets.briefing.reviewActiveSprint")
      : t("codestudioGeneral.widgets.briefing.planNextFeature");
  const failed =
    company.bugs > 20
      ? t("codestudioGeneral.widgets.briefing.bugsAffectingRating", { count: company.bugs.toFixed(0) })
      : t("codestudioGeneral.widgets.briefing.noCriticalIncidents");
  const completed =
    company.modules.length > 0
      ? t("codestudioGeneral.widgets.briefing.moduleInProduction", { name: company.modules.at(-1)?.module.name ?? "" })
      : t("codestudioGeneral.widgets.briefing.noReleasesYet");

  return (
    <div className="cs-briefing">
      <h3>{t("codestudioGeneral.widgets.briefing.title")}</h3>
      <article>
        <span>{t("codestudioGeneral.widgets.briefing.whatsHappening")}</span>
        <b>{notifications[0]?.title ?? t("codestudioGeneral.widgets.briefing.startingFallback")}</b>
      </article>
      <article>
        <span>{t("codestudioGeneral.widgets.briefing.whatToDoNow")}</span>
        <button onClick={() => onNavigate(nextView)}>{nextLabel}</button>
      </article>
      <article>
        <span>{t("codestudioGeneral.widgets.briefing.whatFinished")}</span>
        <p>{completed}</p>
      </article>
      <article>
        <span>{t("codestudioGeneral.widgets.briefing.whatFailed")}</span>
        <p>{failed}</p>
      </article>
    </div>
  );
}

export function MiniChart({ snapshots, metric, label }: { snapshots: Company["snapshots"]; metric: keyof Company["snapshots"][number]; label: string }) {
  const t = useTranslation();
  const data = [...snapshots].reverse().slice(-18);
  const values = data.map((snapshot) => Number(snapshot[metric] ?? 0));
  const max = Math.max(1, ...values);
  return (
    <div className="cs-chart">
      <h3>{label}</h3>
      <div>
        {values.length === 0 ? (
          <span className="cs-muted">{t("codestudioGeneral.widgets.chart.noHistoryYet")}</span>
        ) : (
          values.map((value, index) => (
            <i key={`${metric}-${index}`} style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
          ))
        )}
      </div>
    </div>
  );
}

export function ProgressRow({ label, value, max, hint }: { label: string; value: number; max: number; hint?: string }) {
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

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="cs-progress">
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
