"use client";

import { Rocket, Skull } from "lucide-react";
import type { CompanyView } from "./types";
import { Stat, money, num } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

// Quebrar no es el final: se explica por qué pasó (post-mortem) y el
// nivel de fundador se conserva para la próxima.
export default function FailedView({ company, onFoundNew }: { company: CompanyView; onFoundNew: () => void }) {
  const t = useTranslation();
  return (
    <div className="cs2-stack">
      <section className="cs2-card cs2-failed">
        <Skull size={32} />
        <h3>{t("codestudio.failed.title", { name: company.name })}</h3>
        <p>{t("codestudio.failed.survived", { days: Math.floor(company.gameDays), stage: company.stage.name })}</p>
      </section>
      <section className="cs2-card">
        <h4>{t("codestudio.failed.postMortem")}</h4>
        <p>{company.failureReason}</p>
      </section>
      <section className="cs2-stats">
        <Stat label={t("codestudio.kpi.users")} value={num(company.totalUsers)} hint={t("codestudio.failed.totalUsers")} />
        <Stat label={t("codestudio.kpi.valuation")} value={money(company.valuation)} />
        <Stat label={t("codestudio.career.level", { level: company.profile.level })} value={`${company.profile.xp} XP`} hint={t("codestudio.failed.kept")} />
      </section>
      <button type="button" className="cs2-btn cs2-btn-primary cs2-btn-block" onClick={onFoundNew}>
        <Rocket size={15} /> {t("codestudio.failed.again", { bonus: money(company.profile.startingCashBonus) })}
      </button>
    </div>
  );
}
