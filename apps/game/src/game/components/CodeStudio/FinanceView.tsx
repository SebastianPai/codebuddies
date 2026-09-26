"use client";

import { Landmark, Tag } from "lucide-react";
import type { Catalog, CompanyView } from "./types";
import { Stat, money } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

type Props = {
  company: CompanyView;
  catalog: Catalog;
  busy: boolean;
  onPricing: (level: number) => void;
  onFunding: () => void;
};

export default function FinanceView({ company, catalog, busy, onPricing, onFunding }: Props) {
  const t = useTranslation();
  const m = company.metrics;
  const variable = Math.max(0, m.dailyCosts - m.dailySalaries - m.dailyInfra);
  const monetized = m.arpu > 0;

  const rows = [
    { label: t("codestudio.finance.revenue"), value: m.dailyRevenue, good: true },
    { label: t("codestudio.finance.salaries"), value: -m.dailySalaries, good: false },
    { label: t("codestudio.finance.servers"), value: -m.dailyInfra, good: false },
    { label: t("codestudio.finance.variable"), value: -variable, good: false },
  ];

  return (
    <div className="cs2-stack">
      <section className="cs2-stats">
        <Stat label={t("codestudio.kpi.cash")} value={money(company.cash)} tone={company.cash < 0 ? "bad" : undefined} />
        <Stat
          label={t("codestudio.finance.runway")}
          value={m.runwayDays === null ? "∞" : t("codestudio.finance.days", { days: Math.floor(m.runwayDays) })}
          tone={m.runwayDays !== null && m.runwayDays < 10 ? "bad" : m.runwayDays === null ? "good" : undefined}
          hint={t("codestudio.finance.runwayHint")}
        />
        <Stat label={t("codestudio.kpi.valuation")} value={money(company.valuation)} hint={t("codestudio.finance.yourShare", { amount: money((company.valuation * company.founderEquity) / 100) })} />
        <Stat label={t("codestudio.finance.equity")} value={`${company.founderEquity.toFixed(1)}%`} hint={t("codestudio.finance.equityHint")} />
      </section>

      <section className="cs2-card">
        <h3>{t("codestudio.finance.pnl")}</h3>
        <p className="cs2-muted">{t("codestudio.finance.pnlHint")}</p>
        <ul className="cs2-pnl">
          {rows.map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>
              <b className={row.value >= 0 ? "cs2-tone-good" : "cs2-tone-bad"}>{money(row.value)}</b>
            </li>
          ))}
          <li className="total">
            <span>{t("codestudio.finance.net")}</span>
            <b className={m.dailyProfit >= 0 ? "cs2-tone-good" : "cs2-tone-bad"}>{money(m.dailyProfit)}</b>
          </li>
        </ul>
        {company.daysUntilBankruptcy !== null && <p className="cs2-alert cs2-alert-bad">{t("codestudio.panel.debtAlert", { days: company.daysUntilBankruptcy.toFixed(1) })}</p>}
      </section>

      <section className="cs2-card">
        <h3>
          <Tag size={16} /> {t("codestudio.finance.pricing")}
        </h3>
        <p className="cs2-muted">{monetized ? t("codestudio.finance.pricingHint") : t("codestudio.finance.pricingNoMonetization")}</p>
        <div className="cs2-segmented" role="radiogroup" aria-label={t("codestudio.finance.pricing")}>
          {catalog.priceLevels.map((level) => (
            <button
              key={level.value}
              type="button"
              role="radio"
              aria-checked={company.priceLevel === level.value}
              className={company.priceLevel === level.value ? "active" : ""}
              disabled={busy || company.priceLevel === level.value}
              onClick={() => onPricing(level.value)}
            >
              {level.label}
              <small>×{level.value}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="cs2-card">
        <h3>
          <Landmark size={16} /> {t("codestudio.finance.funding")}
        </h3>
        {company.funding ? (
          <>
            <p>
              {t("codestudio.finance.fundingOffer", {
                name: company.funding.name,
                raise: money(company.funding.raise),
                equity: company.funding.equity,
              })}
            </p>
            {!company.funding.available && (
              <p className="cs2-warn-text">
                {t("codestudio.finance.fundingRequires", { stage: company.funding.minStageName, rating: company.funding.minRating })}
              </p>
            )}
            <button type="button" className="cs2-btn cs2-btn-primary" disabled={busy || !company.funding.available} onClick={onFunding}>
              {t("codestudio.finance.raise", { name: company.funding.name })}
            </button>
            <p className="cs2-muted">{t("codestudio.finance.fundingLesson")}</p>
          </>
        ) : (
          <p className="cs2-muted">{t("codestudio.finance.fundingDone")}</p>
        )}
      </section>
    </div>
  );
}
