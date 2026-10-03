"use client";

import { ArrowRight, Building2, Rocket, Target, Users, Wallet } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { codeStudioLink, useCodeStudioSummary } from "./use-codestudio-summary";

const money = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;

/** Tarjeta del dashboard: tu startup de CodeStudio o la invitación a fundarla. */
export function CodeStudioCard() {
  const t = useTranslation();
  const { data, ready, isAuthenticated } = useCodeStudioSummary();
  if (!isAuthenticated || !ready) return null;

  const company = data?.company ?? null;
  const missionsDone = data?.daily.missions.filter((mission) => mission.done).length ?? 0;
  const missionsTotal = data?.daily.missions.length ?? 0;

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
      <div className="h-1 w-full bg-gradient-to-r from-[rgb(var(--button))] via-[rgb(var(--primary))] to-[rgb(var(--accent))]" />
      <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--button))] text-[rgb(var(--button-text))]">
          <Building2 size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[rgb(var(--primary))]">CodeStudio</p>
          {company ? (
            <>
              <h2 className="mt-1 truncate text-2xl font-black tracking-tight">{company.name}</h2>
              <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">
                {t("site.codestudioPromo.stage", { index: company.stage + 1, total: company.stageCount, name: company.stageName })}
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-1 text-2xl font-black tracking-tight">{t("site.codestudioPromo.foundTitle")}</h2>
              <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">{t("site.codestudioPromo.foundText")}</p>
            </>
          )}
        </div>
        {company && (
          <div className="grid grid-cols-3 gap-3 md:w-[360px]">
            <Mini icon={<Users size={15} />} label={t("site.codestudioPromo.users")} value={company.activeUsers.toLocaleString("en-US")} />
            <Mini icon={<Wallet size={15} />} label={t("site.codestudioPromo.cash")} value={money(company.cash)} />
            <Mini icon={<Target size={15} />} label={t("site.codestudioPromo.missions")} value={`${missionsDone}/${missionsTotal}`} />
          </div>
        )}
        <a
          href={codeStudioLink(company ? "panel" : "guide")}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--button))] px-5 py-3 text-sm font-black uppercase text-[rgb(var(--button-text))] transition hover:brightness-110"
        >
          {company ? <ArrowRight size={16} /> : <Rocket size={16} />}
          {company ? t("site.codestudioPromo.continue") : t("site.codestudioPromo.start")}
        </a>
      </div>
    </section>
  );
}

function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[rgb(var(--secondary-text))]">
        {icon} {label}
      </span>
      <b className="mt-0.5 block truncate text-base font-black">{value}</b>
    </div>
  );
}
