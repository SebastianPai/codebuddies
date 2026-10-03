"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Clock3, Flame, Megaphone, Server, Smile, TrendingUp, X } from "lucide-react";
import type { CompanyView, ViewKey } from "./types";
import { money, num } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

// "Techo de usuarios": por qué la app dejó de crecer y qué hacer. Los
// usuarios nuevos por día son casi fijos y los que se van son un % de los
// que tienes, así que todo se estanca donde se igualan (~nuevos ÷ churn).

export function GrowthCeiling({ company, onNavigate }: { company: CompanyView; onNavigate: (view: ViewKey) => void }) {
  const t = useTranslation();
  const m = company.metrics;
  if (!m.launched || company.activeUsers < 30) return null;
  const ceiling = m.churn > 0 ? Math.round(m.dailyNewUsers / m.churn) : 0;
  const stuck = m.dailyNewUsers > 0 && m.dailyLostUsers >= m.dailyNewUsers * 0.9;

  const tips: Array<{ icon: typeof Server; text: string; view: ViewKey }> = [];
  if (m.utilization > 0.9) tips.push({ icon: Server, text: t("codestudio.ceiling.server"), view: "infra" });
  if (company.satisfaction < 65) tips.push({ icon: Smile, text: t("codestudio.ceiling.satisfaction"), view: "tree" });
  if ((company.marketing.adBudget ?? 0) === 0) tips.push({ icon: Megaphone, text: t("codestudio.ceiling.ads"), view: "marketing" });
  tips.push({ icon: TrendingUp, text: t("codestudio.ceiling.retention"), view: "tree" });

  return (
    <section className={`cs2-card cs2-ceiling ${stuck ? "stuck" : ""}`}>
      <div className="cs2-ceiling-head">
        <span className="cs2-eyebrow">
          <TrendingUp size={13} /> {t("codestudio.ceiling.eyebrow")}
        </span>
        <b>{stuck ? t("codestudio.ceiling.stuck", { users: num(company.activeUsers) }) : t("codestudio.ceiling.growing", { users: num(ceiling) })}</b>
        <p className="cs2-muted">
          {t("codestudio.ceiling.flow", { plus: num(m.dailyNewUsers), minus: num(m.dailyLostUsers), churn: (m.churn * 100).toFixed(1) })}
          {m.adDailyUsers > 0 ? ` · ${t("codestudio.ceiling.fromAds", { users: num(m.adDailyUsers), cac: money(m.adCac) })}` : ""}
        </p>
      </div>
      <ul className="cs2-ceiling-tips">
        {tips.slice(0, 3).map(({ icon: Icon, text, view }) => (
          <li key={text}>
            <button type="button" onClick={() => onNavigate(view)}>
              <Icon size={15} />
              <span>{text}</span>
              <ArrowRight size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Impulsos temporales activos (p. ej. por hacer lo que pedían los usuarios). */
export function ActiveBoosts({ company }: { company: CompanyView }) {
  const t = useTranslation();
  if (!company.boosts?.length) return null;
  return (
    <section className="cs2-boosts">
      {company.boosts.map((boost) => (
        <span key={boost.key} className="cs2-chip cs2-tone-good">
          <Flame size={13} /> {boost.label}: {t("codestudio.ceiling.boost", { growth: Math.round(boost.growth * 100), days: boost.daysLeft })}
        </span>
      ))}
    </section>
  );
}

type Snapshot = { users: number; cash: number; gameDays: number };

/** "Mientras no estabas": lo que pasó desde la última vez que abriste esta empresa. */
export function WhileAway({ company }: { company: CompanyView }) {
  const t = useTranslation();
  const [away, setAway] = useState<{ days: number; users: number; cash: number } | null>(null);
  const key = `cs-away:${company.id}`;

  useEffect(() => {
    let previous: Snapshot | null = null;
    try {
      previous = JSON.parse(window.localStorage.getItem(key) ?? "null");
    } catch {
      previous = null;
    }
    const days = previous ? company.gameDays - previous.gameDays : 0;
    if (previous && days >= 5) setAway({ days: Math.floor(days), users: company.activeUsers - previous.users, cash: company.cash - previous.cash });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  useEffect(() => {
    // Se guarda cada vez que lo ves: la próxima vez compara contra esto.
    try {
      window.localStorage.setItem(key, JSON.stringify({ users: company.activeUsers, cash: company.cash, gameDays: company.gameDays }));
    } catch {
      // Sin storage no hay resumen; no pasa nada.
    }
  }, [key, company.activeUsers, company.cash, company.gameDays]);

  if (!away) return null;
  const sign = (value: number) => (value > 0 ? "+" : "");
  return (
    <section className="cs2-card cs2-away" role="status">
      <Clock3 size={20} />
      <div>
        <b>{t("codestudio.away.title", { days: away.days })}</b>
        <p>
          {t("codestudio.away.users", { value: `${sign(away.users)}${num(away.users)}` })} · {t("codestudio.away.cash", { value: `${sign(away.cash)}${money(away.cash)}` })}
        </p>
      </div>
      <button type="button" className="cs2-icon-btn" aria-label={t("codestudio.away.close")} title={t("codestudio.away.close")} onClick={() => setAway(null)}>
        <X size={14} />
      </button>
    </section>
  );
}

/** Publicidad siempre activa: presupuesto diario que trae usuarios aunque no estés. */
export function AlwaysOnAds({ company, busy, onBudget }: { company: CompanyView; busy: boolean; onBudget: (budget: number) => void }) {
  const t = useTranslation();
  const m = company.metrics;
  const current = company.marketing.adBudget ?? 0;
  const cac = m.adCac > 0 ? m.adCac : 5;
  return (
    <section className="cs2-card cs2-ads">
      <h3>
        <Megaphone size={16} /> {t("codestudio.ads.title")}
      </h3>
      <p className="cs2-muted">{t("codestudio.ads.text")}</p>
      <div className="cs2-ads-options" role="radiogroup" aria-label={t("codestudio.ads.title")}>
        {(company.marketing.adBudgets ?? [0, 50, 150, 400, 1000]).map((budget) => (
          <button
            key={budget}
            type="button"
            role="radio"
            aria-checked={current === budget}
            className={`cs2-ads-option ${current === budget ? "on" : ""}`}
            disabled={busy}
            onClick={() => current !== budget && onBudget(budget)}
          >
            <b>{budget === 0 ? t("codestudio.ads.off") : t("codestudio.ads.perDay", { amount: money(budget) })}</b>
            <small>{budget === 0 ? t("codestudio.ads.offHint") : t("codestudio.ads.users", { users: num(budget / cac) })}</small>
          </button>
        ))}
      </div>
      {current > 0 && m.ltv > 0 && cac > m.ltv && <p className="cs2-warn-text">{t("codestudio.ads.losing", { cac: money(cac), ltv: money(m.ltv) })}</p>}
    </section>
  );
}
