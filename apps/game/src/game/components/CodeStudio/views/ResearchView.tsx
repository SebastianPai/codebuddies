"use client";

import { CheckCircle2, Lock, Unlock } from "lucide-react";
import { Catalog, Company } from "../types";
import { format } from "../utils";
import { makeTrends } from "../mockData";
import { ProgressRow } from "../widgets";
import { useTranslation } from "../../../../i18n/useTranslation";

type TechNode = NonNullable<Catalog["technologies"]>[number];

export default function ResearchView({
  catalog,
  trends,
  company,
  onUnlock,
}: {
  catalog?: Catalog;
  trends: ReturnType<typeof makeTrends>;
  company: Company;
  onUnlock: (technologyId: string) => void;
}) {
  const t = useTranslation();
  const unlockedSlugs = new Set(company.technologies.map((entry) => entry.technology.slug));

  const branches = new Map<string, TechNode[]>();
  for (const node of catalog?.technologies ?? []) {
    const list = branches.get(node.category) ?? [];
    list.push(node);
    branches.set(node.category, list);
  }
  for (const list of branches.values()) list.sort((a, b) => a.order - b.order);

  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-4">
        <h3>{t("codestudioMisc.research.trendsTitle")}</h3>
        {trends.map((trend) => <ProgressRow key={trend.label} label={trend.label} value={trend.score} max={100} hint={trend.type} />)}
      </section>

      <section className="cs-panel cs-span-8">
        <h3>{t("codestudioMisc.research.treeTitle")}</h3>
        <p className="cs-muted">{t("codestudioMisc.research.treeHint")}</p>
        <div className="cs-tech-tree">
          {[...branches.entries()].map(([category, nodes]) => (
            <div key={category} className="cs-tech-branch">
              <h4>{category}</h4>
              {nodes.map((node, index) => {
                const unlocked = unlockedSlugs.has(node.slug);
                const requiredSlugs = node.requirements?.requires ?? [];
                const locked = !unlocked && requiredSlugs.some((slug) => !unlockedSlugs.has(slug));
                const state = unlocked ? "unlocked" : locked ? "locked" : "unlockable";
                const requiredNode = nodes.find((candidate) => candidate.slug === requiredSlugs[0]);
                return (
                  <article key={node.id} className={`cs-tech-node ${state} ${index < nodes.length - 1 ? "has-next" : ""}`}>
                    <div className="cs-tech-node-head">
                      {state === "unlocked" && <CheckCircle2 size={15} />}
                      {state === "locked" && <Lock size={15} />}
                      {state === "unlockable" && <Unlock size={15} />}
                      <b>{node.name}</b>
                    </div>
                    <p>{node.description}</p>
                    {state === "unlocked" && <span className="cs-tech-status">{t("codestudioMisc.research.unlockedLabel")}</span>}
                    {state === "locked" && (
                      <span className="cs-tech-status">
                        {t("codestudioMisc.research.requiresLabel", { name: requiredNode?.name ?? "" })}
                      </span>
                    )}
                    {state === "unlockable" && (
                      <button onClick={() => onUnlock(node.id)} disabled={company.cash < node.cost}>
                        {t("codestudioMisc.research.unlockButton", { amount: format(node.cost) })}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
