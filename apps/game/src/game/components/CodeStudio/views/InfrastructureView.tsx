"use client";

import { Company, Catalog, GuideKey, ViewKey } from "../types";
import { format } from "../utils";
import { makeInfrastructureIndicators } from "../mockData";
import { ProgressBar, ProgressRow } from "../widgets";
import { useNewestItemHighlight } from "../useNewestItemHighlight";
import NextStepCallout from "../NextStepCallout";
import { useTranslation } from "../../../../i18n/useTranslation";

type Props = {
  company: Company;
  catalog?: Catalog;
  onInstall?: (infrastructureTypeId: string) => void;
  onNavigate?: (view: ViewKey, guideKey?: GuideKey) => void;
};

export default function InfrastructureView({ company, catalog, onInstall, onNavigate }: Props) {
  const t = useTranslation();
  const users = Math.max(1, company.activeUsers);
  const indicators = makeInfrastructureIndicators(company);
  const installedTypeIds = new Set(company.infrastructure.map((item) => item.infrastructureType.id));
  const availableToInstall = (catalog?.infrastructure ?? []).filter((type) => !installedTypeIds.has(type.id));
  const { highlightIndex, registerRef } = useNewestItemHighlight(company.infrastructure.length);

  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-12">
        <div className="cs-panel-header">
          <div>
            <h3>{t("codestudioOps.infrastructure.title")}</h3>
            <p>{t("codestudioOps.infrastructure.subtitle")}</p>
          </div>
          <strong>{company.latency.toFixed(0)}ms</strong>
        </div>
        <div className="cs-infra-indicators">
          {indicators.map((indicator) => (
            <article key={indicator.label}>
              <span>{indicator.icon}</span>
              <b>{indicator.label}</b>
              <ProgressBar value={indicator.value} />
              <small>{indicator.hint}</small>
            </article>
          ))}
        </div>
      </section>

      {onInstall && availableToInstall.length > 0 && (
        <section className="cs-panel cs-span-12">
          <h3>{t("codestudioOps.infrastructure.installTitle")}</h3>
          <p className="cs-hire-hint">{t("codestudioOps.infrastructure.installHint")}</p>
          <div className="cs-hire-grid">
            {availableToInstall.map((type) => (
              <article key={type.id} className="cs-hire-card">
                <b>{type.name}</b>
                <span>{type.category}</span>
                <strong>{t("codestudioOps.infrastructure.installCost", { amount: format(type.baseCost) })}</strong>
                <button onClick={() => onInstall(type.id)} disabled={company.cash < type.baseCost}>
                  {t("codestudioOps.infrastructure.installButton")}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="cs-panel cs-span-12">
        <h3>{t("codestudioOps.infrastructure.nodesTitle")}</h3>
        {company.infrastructure.length === 0 && (
          <p className="cs-empty-hint">{t("codestudioOps.infrastructure.noneYet")}</p>
        )}
        {onNavigate && company.infrastructure.length > 0 && <NextStepCallout company={company} onNavigate={onNavigate} />}
        <div className="cs-infra-map">
          {company.infrastructure.map((item, index) => {
            const usage = Math.min(100, (users / Math.max(1, item.capacity ?? 1000)) * 100);
            const nextLevelCost = (catalog?.infrastructure ?? []).find((type) => type.id === item.infrastructureType.id)?.baseCost;
            return (
              <article
                key={item.infrastructureType.name}
                ref={registerRef(index)}
                className={`cs-infra-node ${highlightIndex === index ? "cs-highlight-new" : ""}`}
              >
                <div />
                <h3>{item.infrastructureType.name}</h3>
                <p>{t("codestudioOps.infrastructure.level", { level: item.level })}</p>
                <ProgressRow
                  label={t("codestudioOps.infrastructure.usageLabel")}
                  value={usage}
                  max={100}
                  hint={t("codestudioOps.infrastructure.capacityHint", { value: format(item.capacity ?? 1000) })}
                />
                <ProgressRow label={t("codestudioOps.infrastructure.statusLabel")} value={item.stability ?? company.stability} max={100} hint={`${item.latency ?? company.latency}ms`} />
                {onInstall && nextLevelCost !== undefined && (
                  <button
                    className="cs-infra-upgrade"
                    onClick={() => onInstall(item.infrastructureType.id)}
                    disabled={company.cash < nextLevelCost * (item.level + 1)}
                  >
                    {t("codestudioOps.infrastructure.upgradeButton", {
                      level: item.level + 1,
                      cost: format(nextLevelCost * (item.level + 1)),
                    })}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
