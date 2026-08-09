"use client";

import { Company, GuideKey, ViewKey } from "../types";
import { format } from "../utils";
import { makeNotifications, makeObjectives, makeTrends } from "../mockData";
import { ActionBriefing, ActivityTimeline, Kpis, MiniChart, ProgressRow } from "../widgets";
import TutorialPanel from "./TutorialPanel";
import { useTranslation } from "../../../../i18n/useTranslation";

export default function DashboardView({
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
  onNavigate: (view: ViewKey, guideKey?: GuideKey) => void;
}) {
  const t = useTranslation();
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-8">
        <div className="cs-panel-header">
          <div>
            <h3>{t("codestudioOps.dashboard.title")}</h3>
            <p>{t("codestudioOps.dashboard.subtitle")}</p>
          </div>
          <strong>${format(company.cash)}</strong>
        </div>
        <Kpis company={company} />
        <MiniChart snapshots={company.snapshots} metric="activeUsers" label={t("codestudioOps.dashboard.activeUsersLabel")} />
      </section>

      <section className="cs-panel cs-span-4">
        <ActivityTimeline notifications={notifications} />
      </section>

      <section className="cs-panel cs-span-5">
        <h3>{t("codestudioOps.dashboard.objectivesTitle")}</h3>
        {objectives.map((goal) => (
          <ProgressRow key={goal.label} label={goal.label} value={goal.current} max={goal.target} hint={goal.scope} />
        ))}
      </section>

      <TutorialPanel company={company} onNavigate={onNavigate} />

      <section className="cs-panel cs-span-4">
        <h3>{t("codestudioOps.dashboard.trendsTitle")}</h3>
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
