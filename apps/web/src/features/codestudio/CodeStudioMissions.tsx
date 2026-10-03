"use client";

import { ArrowRight, CheckCircle2, Gamepad2, Gift, Zap } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { CurrencyIcon } from "@/shared/ui/currency-icon";
import { codeStudioLink, useCodeStudioSummary } from "./use-codestudio-summary";

/** Misiones diarias de CodeStudio en /missions: para que se sepa que existen. */
export function CodeStudioMissions() {
  const t = useTranslation();
  const { data, ready, isAuthenticated } = useCodeStudioSummary();
  if (!isAuthenticated || !ready || !data) return null;
  const { missions, bonus, resetsInMinutes } = data.daily;
  const hours = Math.floor(resetsInMinutes / 60);
  const minutes = resetsInMinutes % 60;

  return (
    <section className="mb-8 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[rgb(var(--primary))]">
            <Gamepad2 size={15} /> {t("site.codestudioPromo.missionsEyebrow")}
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">{t("site.codestudioPromo.missionsTitle")}</h2>
          <p className="mt-1 max-w-xl text-sm text-[rgb(var(--secondary-text))]">{t("site.codestudioPromo.missionsText")}</p>
        </div>
        <a
          href={codeStudioLink("panel")}
          className="inline-flex items-center gap-2 rounded-2xl bg-[rgb(var(--button))] px-5 py-3 text-sm font-black uppercase text-[rgb(var(--button-text))] transition hover:brightness-110"
        >
          {t("site.codestudioPromo.play")} <ArrowRight size={16} />
        </a>
      </div>

      <ul className="mt-5 grid gap-3 md:grid-cols-3">
        {missions.map((mission) => (
          <li
            key={mission.key}
            className={`rounded-2xl border bg-[rgb(var(--background))] p-4 ${mission.done ? "border-emerald-500/50" : "border-[rgb(var(--border))]"}`}
          >
            <div className="flex items-start gap-2">
              {mission.done && <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-500" />}
              <b className="text-sm leading-snug">{mission.label}</b>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--border))]">
              <div className="h-full rounded-full bg-[rgb(var(--primary))]" style={{ width: `${(mission.progress / Math.max(1, mission.target)) * 100}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-bold text-[rgb(var(--secondary-text))]">
              <span>
                {mission.progress}/{mission.target}
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <Zap size={12} /> {mission.xp}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CurrencyIcon currency="coins" size={12} /> {mission.coins}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[rgb(var(--secondary-text))]">
        <Gift size={15} className="text-[rgb(var(--primary))]" />
        {bonus.done ? t("site.codestudioPromo.bonusDone") : t("site.codestudioPromo.bonus", { xp: bonus.xp, coins: bonus.coins })}
        <span className="opacity-70">· {t("site.codestudioPromo.resets", { hours, minutes })}</span>
      </p>
    </section>
  );
}
