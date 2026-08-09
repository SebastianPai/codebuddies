"use client";

import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Catalog, Company } from "../types";
import { ProgressBar } from "../widgets";
import { isModuleLocked, moduleRequirementNames } from "../utils";
import { useTranslation } from "../../../../i18n/useTranslation";

export default function RoadmapView({
  company,
  availableModules,
  installedModuleSlugs,
  moduleNameBySlug,
  onDevelop,
}: {
  company: Company;
  availableModules: Catalog["modules"];
  installedModuleSlugs: Set<string>;
  moduleNameBySlug: Record<string, string>;
  onDevelop: (moduleId: string) => void;
}) {
  const t = useTranslation();
  const pending = availableModules.slice(0, 7);
  const development = company.development.filter((task) => ["QUEUED", "IN_PROGRESS"].includes(task.status) && task.progress < 70);
  const qa = company.development.filter((task) => ["QUEUED", "IN_PROGRESS"].includes(task.status) && task.progress >= 70);
  const release = company.development.filter((task) => task.status === "COMPLETED").slice(0, 6);
  const production = company.modules.slice(-7).reverse();
  return (
    <div className="cs-roadmap">
      <RoadmapColumn title={t("codestudioMisc.roadmap.pending")} tone="pending">
        {pending.map((module) => {
          const locked = isModuleLocked(module, installedModuleSlugs);
          if (locked) {
            return (
              <article key={module.id} className="cs-roadmap-card locked">
                <b>{module.name}</b>
                <small>
                  <Lock size={12} /> {t("codestudioGeneral.common.lockedHint", { name: moduleRequirementNames(module, moduleNameBySlug) })}
                </small>
              </article>
            );
          }
          return (
            <button key={module.id} className="cs-roadmap-card" onClick={() => void onDevelop(module.id)}>
              <b>{module.name}</b>
              <small>{module.category} · ${module.cost}</small>
            </button>
          );
        })}
      </RoadmapColumn>
      <RoadmapColumn title={t("codestudioMisc.roadmap.development")} tone="active">
        {development.map((task) => (
          <article key={task.id} className="cs-roadmap-card">
            <b>{task.module.name}</b>
            <ProgressBar value={task.progress} />
          </article>
        ))}
      </RoadmapColumn>
      <RoadmapColumn title={t("codestudioMisc.roadmap.qa")} tone="qa">
        {qa.map((task) => (
          <article key={task.id} className="cs-roadmap-card">
            <b>{task.module.name}</b>
            <small>{t("codestudioMisc.roadmap.qaHint")}</small>
            <ProgressBar value={task.progress} />
          </article>
        ))}
      </RoadmapColumn>
      <RoadmapColumn title={t("codestudioMisc.roadmap.release")} tone="release">
        {release.map((task) => (
          <article key={task.id} className="cs-roadmap-card done">
            <b>{task.module.name}</b>
            <small>{t("codestudioMisc.roadmap.readyToPublish")}</small>
          </article>
        ))}
      </RoadmapColumn>
      <RoadmapColumn title={t("codestudioMisc.roadmap.production")} tone="done">
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

function RoadmapColumn({ title, tone, children }: { title: string; tone: string; children: ReactNode }) {
  return (
    <section className={`cs-roadmap-column ${tone}`}>
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}
