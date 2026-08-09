"use client";

import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Company, GuideKey, ViewKey } from "../types";
import { secondsLabel } from "../utils";
import { ProgressBar } from "../widgets";
import NextStepCallout from "../NextStepCallout";
import BugCard from "../BugCard";
import { teamSpeedMultiplier } from "../TeamSpeedSummary";
import { useTranslation } from "../../../../i18n/useTranslation";

const STATUS_META = {
  QUEUED: { icon: Clock, className: "queued", labelKey: "codestudioOps.development.statusQueued" },
  IN_PROGRESS: { icon: Loader2, className: "in-progress", labelKey: "codestudioOps.development.statusInProgress" },
  COMPLETED: { icon: CheckCircle2, className: "completed", labelKey: "codestudioOps.development.statusCompleted" },
} as const;

export default function DevelopmentView({
  company,
  onNavigate,
  onFixBug,
}: {
  company: Company;
  onNavigate: (view: ViewKey, guideKey?: GuideKey) => void;
  onFixBug: (bugId: string, method: "cash" | "employee", employeeId?: string) => void;
}) {
  const t = useTranslation();
  const hasActiveTasks = company.development.some((task) => task.status === "QUEUED" || task.status === "IN_PROGRESS");

  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-8">
        <h3>{t("codestudioOps.development.title")}</h3>
        <p className="cs-muted">
          {t("codestudioOps.development.teamSpeedNote", {
            count: company.employees.length,
            value: teamSpeedMultiplier(company.employees).toFixed(2),
          })}
        </p>
        {company.development.length === 0 && <p className="cs-muted">{t("codestudioOps.development.emptyState")}</p>}
        {company.development.length > 0 && !hasActiveTasks && (
          <NextStepCallout company={company} onNavigate={onNavigate} />
        )}
        <div className="cs-dev-list">
          {company.development.map((task) => {
            const remaining = Math.max(0, (task.requiredSeconds ?? 0) - (task.spentSeconds ?? 0));
            const meta = STATUS_META[task.status as keyof typeof STATUS_META] ?? STATUS_META.QUEUED;
            const StatusIcon = meta.icon;
            return (
              <article key={task.id} className="cs-dev-card">
                <div>
                  <b>{task.module.name}</b>
                  <span className={`cs-dev-status ${meta.className}`}>
                    <StatusIcon size={14} />
                    {t(meta.labelKey)}
                  </span>
                </div>
                <ProgressBar value={task.progress} />
                <footer>
                  <small>
                    {task.status === "COMPLETED"
                      ? t("codestudioOps.development.shipped")
                      : t("codestudioOps.development.timeRemaining", { time: secondsLabel(remaining) })}
                  </small>
                  <small>{t("codestudioOps.development.workingLabel")}</small>
                  <small>{t("codestudioOps.development.benefit", { value: Number(task.module.effects?.growth ?? 0.02).toFixed(2) })}</small>
                </footer>
              </article>
            );
          })}
        </div>
      </section>
      <section className="cs-panel cs-span-4">
        <h3>{t("codestudioOps.development.bugsTitle")}</h3>
        <p className="cs-muted">{t("codestudioOps.development.bugsHint")}</p>
        {company.bugReports.length === 0 && (
          <p className="cs-bug-fixed">
            <CheckCircle2 size={14} />
            {t("codestudioOps.development.noBugs")}
          </p>
        )}
        {company.bugReports.map((bug) => (
          <BugCard key={bug.id} bug={bug} employees={company.employees} cash={company.cash} onFix={onFixBug} />
        ))}
      </section>
    </div>
  );
}
