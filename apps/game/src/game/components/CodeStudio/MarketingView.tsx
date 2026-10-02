"use client";

import { Lock, Megaphone, Sparkles, Star, TrendingDown } from "lucide-react";
import type { Catalog, CompanyView } from "./types";
import { Stat, money, num, pct } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

type Props = {
  company: CompanyView;
  catalog: Catalog;
  busy: boolean;
  onLaunch: (campaignId: string, multiplier: number) => void;
};

export default function MarketingView({ company, catalog, busy, onLaunch }: Props) {
  const t = useTranslation();
  const m = company.metrics;
  const offline = !m.launched;

  return (
    <div className="cs2-stack">
      <section className="cs2-card">
        <h3>{t("codestudio.marketing.title")}</h3>
        <p className="cs2-muted">{t("codestudio.marketing.subtitle")}</p>
      </section>

      <section className="cs2-stats">
        <Stat
          label={t("codestudio.marketing.ltv")}
          value={m.ltv > 0 ? money(m.ltv) : "—"}
          hint={m.ltv > 0 ? t("codestudio.marketing.ltvHint", { arpu: money(m.arpu), churn: pct(m.churn, 1) }) : t("codestudio.marketing.noMonetization")}
        />
        <Stat label={t("codestudio.marketing.discount")} value={pct(m.cacDiscount)} hint={t("codestudio.marketing.discountHint")} />
        <Stat label={t("codestudio.marketing.ratingEffect")} value={<><Star size={14} fill="currentColor" style={{ verticalAlign: -2 }} /> {company.rating.toFixed(1)}</>} hint={t("codestudio.marketing.ratingHint")} />
      </section>

      {offline && <p className="cs2-alert cs2-alert-warn">{t("codestudio.marketing.offline")}</p>}

      <section className="cs2-cards">
        {company.marketing.channels.map((channel) => (
          <article key={channel.id} className={`cs2-card cs2-channel ${channel.locked ? "locked" : ""}`}>
            <div className="cs2-mini-head">
              <b>
                <Megaphone size={14} /> {channel.name}
              </b>
              {channel.fit >= 1.3 && (
                <span className="cs2-fit good">
                  <Sparkles size={11} /> {t("codestudio.marketing.fitGood")}
                </span>
              )}
              {channel.fit <= 0.7 && (
                <span className="cs2-fit bad">
                  <TrendingDown size={11} /> {t("codestudio.marketing.fitBad")}
                </span>
              )}
            </div>
            <small className="cs2-muted">
              {channel.channel}
              {channel.fatigue > 0 ? ` · ${t("codestudio.marketing.fatigue", { count: channel.fatigue })}` : ""}
            </small>
            {channel.locked ? (
              <small className="cs2-lock">
                <Lock size={11} /> {t("codestudio.tree.lockedStage", { stage: catalog.stages[channel.minStage]?.name ?? channel.minStage })}
              </small>
            ) : (
              <div className="cs2-quotes">
                {channel.quotes.map((quote) => {
                  const losing = m.ltv > 0 && quote.cac > m.ltv;
                  return (
                    <button
                      key={quote.multiplier}
                      type="button"
                      className={`cs2-quote ${losing ? "losing" : m.ltv > 0 ? "winning" : ""}`}
                      disabled={busy || offline || company.cash < quote.cost}
                      onClick={() => onLaunch(channel.id, quote.multiplier)}
                    >
                      <b>{money(quote.cost)}</b>
                      <span>{t("codestudio.marketing.users", { count: num(quote.users) })}</span>
                      <small>{t("codestudio.marketing.cac", { amount: money(quote.cac) })}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </article>
        ))}
      </section>

      {company.marketing.summary.length > 0 && (
        <section className="cs2-card">
          <h4>{t("codestudio.marketing.history")}</h4>
          <ul className="cs2-list">
            {company.marketing.summary.map((row) => (
              <li key={row.channel}>
                <div>
                  <b>{row.channel}</b>
                  <small>
                    {t("codestudio.marketing.historyRow", {
                      users: num(row.gainedUsers),
                      spent: money(row.spent),
                      runs: row.runs,
                      cac: money(row.spent / Math.max(1, row.gainedUsers)),
                    })}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
