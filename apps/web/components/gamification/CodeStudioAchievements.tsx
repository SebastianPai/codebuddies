"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarCheck, Check, Coins, Gamepad2, Lock, Sparkles, Trophy } from "lucide-react";
import { api } from "../../utils/api";
import { getGameUrl } from "../../src/config/env";
import { useLanguage } from "../../src/i18n/LanguageContext";
import { useTranslation } from "../../src/i18n/useTranslation";

// Logros de CodeStudio (el simulador de startups del juego) en la web: se
// ven bloqueados/desbloqueados con la pista de cómo conseguir cada uno, y
// un botón abre el juego directo en CodeStudio (?open=codestudio&view=…,
// ver apps/game/src/game/deepLink.ts).

type CodeStudioAchievement = {
  key: string;
  name: string;
  description: string;
  howTo: string;
  xp: number;
  coins: number;
  unlocked: boolean;
  unlockedAt: string | null;
};

type CodeStudioAchievementsPayload = {
  summary: { total: number; unlocked: number; locked: number };
  level: number;
  hasPlayed: boolean;
  daily: { missions: Array<{ key: string; label: string; done: boolean }>; bonus: { done: boolean } };
  items: CodeStudioAchievement[];
};

type Filter = "all" | "unlocked" | "locked";

export function codeStudioUrl(view: "panel" | "career" | "tree" | "bugs" = "career") {
  const url = new URL(getGameUrl());
  url.searchParams.set("open", "codestudio");
  url.searchParams.set("view", view);
  return url.toString();
}

export default function CodeStudioAchievements() {
  const t = useTranslation();
  const language = useLanguage();
  const lang = language?.lang ?? "es";
  const [data, setData] = useState<CodeStudioAchievementsPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    api
      .get<CodeStudioAchievementsPayload>(`/codestudio/achievements?lang=${encodeURIComponent(lang)}`)
      .then((payload) => !cancelled && setData(payload))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const items = useMemo(() => {
    const list = data?.items ?? [];
    if (filter === "unlocked") return list.filter((item) => item.unlocked);
    if (filter === "locked") return list.filter((item) => !item.unlocked);
    // Primero los desbloqueados, después los bloqueados.
    return [...list].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  }, [data, filter]);

  if (failed) return null;
  if (!data) {
    return <div className="mt-6 h-48 animate-pulse rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))]" />;
  }

  const percent = Math.round((data.summary.unlocked / Math.max(1, data.summary.total)) * 100);
  const dailyDone = data.daily.missions.filter((mission) => mission.done).length;

  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))]" aria-labelledby="codestudio-achievements">
      <div className="relative border-b border-[rgb(var(--border))] p-5 sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(circle at 0% 0%, rgb(var(--button) / 0.14), transparent 45%)" }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--button))] text-[rgb(var(--button-text))]">
              <Gamepad2 size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-[rgb(var(--primary))]">{t("gamification.codestudio.eyebrow")}</p>
              <h2 id="codestudio-achievements" className="text-2xl font-black sm:text-3xl">
                {t("gamification.codestudio.title")}
              </h2>
              <p className="mt-1 max-w-xl text-sm text-[rgb(var(--secondary-text))]">{t("gamification.codestudio.description")}</p>
            </div>
          </div>
          <a
            href={codeStudioUrl(data.hasPlayed ? "career" : "panel")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[rgb(var(--button))] px-5 py-3 text-sm font-black text-[rgb(var(--button-text))] transition hover:opacity-90"
          >
            {data.hasPlayed ? t("gamification.codestudio.open") : t("gamification.codestudio.start")}
            <ArrowUpRight size={16} />
          </a>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4">
            <div className="flex items-center justify-between text-xs font-black uppercase text-[rgb(var(--secondary-text))]">
              {t("gamification.codestudio.progress")}
              <Trophy size={15} className="text-[rgb(var(--primary))]" />
            </div>
            <p className="mt-2 text-2xl font-black">
              {data.summary.unlocked}
              <span className="text-base text-[rgb(var(--secondary-text))]"> / {data.summary.total}</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--border))]">
              <div className="h-full rounded-full bg-[rgb(var(--button))] transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
          <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4">
            <div className="flex items-center justify-between text-xs font-black uppercase text-[rgb(var(--secondary-text))]">
              {t("gamification.codestudio.level")}
              <Sparkles size={15} className="text-[rgb(var(--primary))]" />
            </div>
            <p className="mt-2 text-2xl font-black">{data.level}</p>
            <p className="text-xs text-[rgb(var(--secondary-text))]">{t("gamification.codestudio.levelHint")}</p>
          </div>
          <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4">
            <div className="flex items-center justify-between text-xs font-black uppercase text-[rgb(var(--secondary-text))]">
              {t("gamification.codestudio.daily")}
              <CalendarCheck size={15} className="text-[rgb(var(--primary))]" />
            </div>
            <p className="mt-2 text-2xl font-black">
              {dailyDone}
              <span className="text-base text-[rgb(var(--secondary-text))]"> / {data.daily.missions.length}</span>
            </p>
            <p className="truncate text-xs text-[rgb(var(--secondary-text))]">
              {data.daily.bonus.done ? t("gamification.codestudio.dailyDone") : data.daily.missions.find((mission) => !mission.done)?.label}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("gamification.codestudio.filter")}>
          {(["all", "unlocked", "locked"] as Filter[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${
                filter === key
                  ? "border-[rgb(var(--button))] bg-[rgb(var(--button))] text-[rgb(var(--button-text))]"
                  : "border-[rgb(var(--border))] text-[rgb(var(--secondary-text))] hover:text-[rgb(var(--text))]"
              }`}
            >
              {t(`gamification.codestudio.filter_${key}`)}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.key}
              className={`flex flex-col rounded-lg border p-4 transition ${
                item.unlocked
                  ? "border-[rgb(var(--button)/0.45)] bg-[rgb(var(--button)/0.08)]"
                  : "border-[rgb(var(--border))] bg-[rgb(var(--background))]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    item.unlocked ? "bg-[rgb(var(--button))] text-[rgb(var(--button-text))]" : "bg-[rgb(var(--border))] text-[rgb(var(--secondary-text))]"
                  }`}
                >
                  {item.unlocked ? <Check size={18} /> : <Lock size={16} />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black leading-tight">{item.name}</h3>
                  <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">{item.description}</p>
                </div>
              </div>

              {!item.unlocked && (
                <p className="mt-3 rounded-md border border-dashed border-[rgb(var(--border))] px-3 py-2 text-xs text-[rgb(var(--secondary-text))]">
                  <span className="font-black text-[rgb(var(--text))]">{t("gamification.codestudio.howTo")}</span> {item.howTo}
                </p>
              )}

              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--border)/0.6)] px-2.5 py-1">
                    <Sparkles size={12} /> {item.xp} XP
                  </span>
                  {item.coins > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--border)/0.6)] px-2.5 py-1">
                      <Coins size={12} /> {item.coins}
                    </span>
                  )}
                </div>
                {item.unlocked && item.unlockedAt ? (
                  <span className="text-xs text-[rgb(var(--secondary-text))]">
                    {new Date(item.unlockedAt).toLocaleDateString(lang === "de" ? "de-DE" : lang === "en-us" ? "en-US" : "es-CO")}
                  </span>
                ) : (
                  <a href={codeStudioUrl("panel")} className="inline-flex items-center gap-1 text-xs font-black text-[rgb(var(--primary))] hover:underline">
                    {t("gamification.codestudio.goDoIt")} <ArrowUpRight size={12} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
