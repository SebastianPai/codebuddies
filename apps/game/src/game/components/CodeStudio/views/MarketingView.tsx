"use client";

import { Rocket } from "lucide-react";
import { Catalog, Company } from "../types";
import { format } from "../utils";
import { useTranslation } from "../../../../i18n/useTranslation";

export default function MarketingView({
  catalog,
  company,
  onLaunch,
}: {
  catalog?: Catalog;
  company: Company;
  onLaunch: (campaignId: string) => void;
}) {
  const t = useTranslation();
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-8">
        <h3>{t("codestudioOps.marketing.launchTitle")}</h3>
        <p className="cs-muted">{t("codestudioOps.marketing.launchHint")}</p>
        <div className="cs-hire-grid">
          {(catalog?.campaigns ?? []).map((campaign) => (
            <article key={campaign.id} className="cs-hire-card">
              <b>{campaign.name}</b>
              <span>{campaign.channel}</span>
              <strong>{t("codestudioOps.marketing.baseCost", { amount: `$${format(campaign.baseCost)}` })}</strong>
              <button onClick={() => onLaunch(campaign.id)} disabled={company.cash < campaign.baseCost}>
                <Rocket size={14} />
                {t("codestudioOps.marketing.launchButton")}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="cs-panel cs-span-4">
        <h3>{t("codestudioOps.marketing.rankingTitle")}</h3>
        <p className="cs-muted">{t("codestudioOps.marketing.rankingHint")}</p>
        {company.marketingSummary.length === 0 && (
          <p className="cs-empty-hint">{t("codestudioOps.marketing.noRunsYet")}</p>
        )}
        <div className="cs-ranking">
          {company.marketingSummary.map((row, index) => (
            <article key={row.channel}>
              <b>#{index + 1}</b>
              <span>{row.channel}</span>
              <small>
                {t("codestudioOps.marketing.rankingGained", { count: row.gainedUsers })} ·{" "}
                {t("codestudioOps.marketing.rankingSpent", { amount: format(row.spent) })} ·{" "}
                {t("codestudioOps.marketing.rankingRuns", { count: row.runs })}
              </small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
