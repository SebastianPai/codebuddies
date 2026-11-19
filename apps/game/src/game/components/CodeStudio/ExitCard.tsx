"use client";

import { Building2, Landmark, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import type { CompanyView, Profile } from "./types";
import { ProgressBar, money } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

// La salida al llegar a Unicornio (Fase 3): vender la startup o salir a bolsa.
// También muestra el estado después: vendida (trofeo) o en bolsa (trimestre).

const QUARTER_DAYS = 90;
const QUARTER_GROWTH = 1.1;

export function ExitCard({ company, busy, onExit }: { company: CompanyView; busy: boolean; onExit: (type: "sale" | "ipo") => void }) {
  const t = useTranslation();
  const exit = company.exit;

  if (exit?.type === "sale") {
    return (
      <section className="cs2-exit cs2-exit-done">
        <Trophy size={22} aria-hidden="true" />
        <div>
          <b>{t("codestudio.exit.soldTitle")}</b>
          <p>{t("codestudio.exit.soldText", { valuation: money(exit.valuation) })}</p>
        </div>
      </section>
    );
  }

  if (exit?.type === "ipo") {
    const start = exit.quarterStartDay ?? company.gameDays;
    const base = Math.max(1, exit.quarterBase ?? company.valuation);
    const day = Math.min(QUARTER_DAYS, Math.max(0, Math.floor(company.gameDays - start)));
    const growth = Math.round((company.valuation / base - 1) * 100);
    const onTrack = company.valuation >= base * QUARTER_GROWTH;
    return (
      <section className={`cs2-exit cs2-exit-ipo ${onTrack ? "good" : "warn"}`}>
        <Landmark size={22} aria-hidden="true" />
        <div className="cs2-exit-body">
          <b>{t("codestudio.exit.ipoTitle")}</b>
          <p>{t("codestudio.exit.ipoQuarter", { day, total: QUARTER_DAYS })}</p>
          <ProgressBar value={(day / QUARTER_DAYS) * 100} tone={onTrack ? "good" : "warn"} />
          <p className="cs2-exit-growth">
            {onTrack ? <TrendingUp size={15} aria-hidden="true" /> : <TrendingDown size={15} aria-hidden="true" />}
            {t("codestudio.exit.ipoGrowth", { growth, target: 10 })}
          </p>
          <small>{t("codestudio.exit.ipoRecord", { won: exit.quartersWon ?? 0, lost: exit.quartersLost ?? 0 })}</small>
        </div>
      </section>
    );
  }

  if (!company.canExit) return null;

  return (
    <section className="cs2-exit cs2-exit-choose">
      <span className="cs2-nextcard-eyebrow">{t("codestudio.exit.eyebrow")}</span>
      <h2 className="cs2-nextcard-title">{t("codestudio.exit.title")}</h2>
      <p className="cs2-nextcard-why">{t("codestudio.exit.text")}</p>
      <div className="cs2-exit-options">
        <div>
          <Landmark size={20} aria-hidden="true" />
          <b>{t("codestudio.exit.ipo")}</b>
          <p>{t("codestudio.exit.ipoHelp")}</p>
          <button type="button" className="cs2-nextcard-btn" disabled={busy} onClick={() => onExit("ipo")}>
            {t("codestudio.exit.ipoCta")}
          </button>
        </div>
        <div>
          <Building2 size={20} aria-hidden="true" />
          <b>{t("codestudio.exit.sale")}</b>
          <p>{t("codestudio.exit.saleHelp")}</p>
          <button type="button" className="cs2-nextcard-btn" disabled={busy} onClick={() => onExit("sale")}>
            {t("codestudio.exit.saleCta")}
          </button>
        </div>
      </div>
    </section>
  );
}

// Vitrina de la Carrera: un trofeo por cada salida.
export function ExitTrophies({ exits }: { exits?: Profile["exits"] }) {
  const t = useTranslation();
  if (!exits || exits.length === 0) return null;
  return (
    <section className="cs2-card">
      <h4 className="cs2-ts-title">
        <Trophy size={14} aria-hidden="true" /> {t("codestudio.exit.trophies", { count: exits.length })}
      </h4>
      <ul className="cs2-trophies">
        {exits.map((entry) => (
          <li key={`${entry.type}:${entry.companyId}`}>
            <Trophy size={20} aria-hidden="true" />
            <b>{entry.name}</b>
            <small>
              {t(entry.type === "sale" ? "codestudio.exit.trophySale" : "codestudio.exit.trophyIpo")} · {money(entry.valuation)}
            </small>
          </li>
        ))}
      </ul>
    </section>
  );
}
