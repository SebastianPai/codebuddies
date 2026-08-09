"use client";

import { Lock } from "lucide-react";
import { Catalog } from "../types";
import { secondsLabel, isModuleLocked, moduleRequirementNames } from "../utils";
import { useTranslation } from "../../../../i18n/useTranslation";

export default function ModuleLibrary({
  groupedModules,
  expanded,
  setExpanded,
  moduleSearch,
  setModuleSearch,
  installedModuleSlugs,
  moduleNameBySlug,
  onDevelop,
}: {
  groupedModules: Record<string, Catalog["modules"]>;
  expanded: Record<string, boolean>;
  setExpanded: (value: Record<string, boolean>) => void;
  moduleSearch: string;
  setModuleSearch: (value: string) => void;
  installedModuleSlugs: Set<string>;
  moduleNameBySlug: Record<string, string>;
  onDevelop: (moduleId: string) => void;
}) {
  const t = useTranslation();
  return (
    <section className="cs-panel cs-module-library">
      <div className="cs-panel-header">
        <div>
          <h3>{t("codestudioOps.moduleLibrary.title")}</h3>
          <p>{t("codestudioOps.moduleLibrary.subtitle")}</p>
        </div>
        <input
          value={moduleSearch}
          onChange={(event) => setModuleSearch(event.target.value)}
          placeholder={t("codestudioOps.moduleLibrary.searchPlaceholder")}
        />
      </div>
      <div className="cs-module-groups">
        {Object.entries(groupedModules).map(([category, modules]) => {
          const isOpen = expanded[category] ?? Object.keys(expanded).length === 0;
          return (
            <article key={category}>
              <button onClick={() => setExpanded({ ...expanded, [category]: !isOpen })}>
                <b>{category}</b>
                <small>{t("codestudioOps.moduleLibrary.featureCount", { count: modules.length })}</small>
              </button>
              {isOpen && (
                <div>
                  {modules.slice(0, 12).map((module) => {
                    const locked = isModuleLocked(module, installedModuleSlugs);
                    return (
                      <button key={module.id} disabled={locked} onClick={() => void onDevelop(module.id)}>
                        <span>{module.name}</span>
                        {locked ? (
                          <small>
                            <Lock size={12} /> {t("codestudioGeneral.common.lockedHint", { name: moduleRequirementNames(module, moduleNameBySlug) })}
                          </small>
                        ) : (
                          <small>${module.cost} · {secondsLabel(module.developmentSeconds)}</small>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
