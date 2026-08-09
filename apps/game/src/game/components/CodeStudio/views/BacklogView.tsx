"use client";

import { Lock } from "lucide-react";
import { BacklogPriority, Catalog } from "../types";
import { isModuleLocked, moduleRequirementNames } from "../utils";
import { useTranslation } from "../../../../i18n/useTranslation";

export default function BacklogView({
  modules,
  priority,
  setPriority,
  installedModuleSlugs,
  moduleNameBySlug,
  onDevelop,
}: {
  modules: Catalog["modules"];
  priority: Record<string, BacklogPriority>;
  setPriority: (value: Record<string, BacklogPriority>) => void;
  installedModuleSlugs: Set<string>;
  moduleNameBySlug: Record<string, string>;
  onDevelop: (moduleId: string) => void;
}) {
  const t = useTranslation();
  const sorted = [...modules].slice(0, 24).sort((a, b) => {
    const weight = { Urgente: 0, Alta: 1, Media: 2, Baja: 3 };
    return (weight[priority[a.id] ?? "Media"] ?? 1) - (weight[priority[b.id] ?? "Media"] ?? 1);
  });
  return (
    <section className="cs-panel">
      <h3>{t("codestudioGeneral.backlog.title")}</h3>
      <p className="cs-muted">{t("codestudioGeneral.backlog.priorityHint")}</p>
      <div className="cs-backlog">
        {sorted.map((module) => {
          const locked = isModuleLocked(module, installedModuleSlugs);
          return (
            <article key={module.id} className={locked ? "locked" : ""}>
              <div>
                <b>{module.name}</b>
                <small>{t("codestudioGeneral.backlog.moduleMeta", { category: module.category, difficulty: module.difficulty })}</small>
              </div>
              {locked ? (
                <span className="cs-locked-hint">
                  <Lock size={13} />
                  {t("codestudioGeneral.common.lockedHint", { name: moduleRequirementNames(module, moduleNameBySlug) })}
                </span>
              ) : (
                <>
                  <select
                    value={priority[module.id] ?? "Media"}
                    onChange={(event) => setPriority({ ...priority, [module.id]: event.target.value as BacklogPriority })}
                  >
                    <option value="Urgente">{t("codestudioGeneral.backlog.priorityUrgent")}</option>
                    <option value="Alta">{t("codestudioGeneral.backlog.priorityHigh")}</option>
                    <option value="Media">{t("codestudioGeneral.backlog.priorityMedium")}</option>
                    <option value="Baja">{t("codestudioGeneral.backlog.priorityLow")}</option>
                  </select>
                  <button onClick={() => void onDevelop(module.id)}>{t("codestudioGeneral.backlog.developButton")}</button>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
