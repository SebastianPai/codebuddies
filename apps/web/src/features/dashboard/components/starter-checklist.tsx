"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, Code2, Flame, Gift, Rocket, Shirt } from "lucide-react";
import { api } from "@/shared/api";
import { getGameUrl } from "@/config/env";
import { useTranslation } from "@/i18n/useTranslation";
import { CurrencyIcon } from "@/shared/ui/currency-icon";
import { useReward } from "../../../../contexts/RewardContext";

// "Primeros pasos": lo primero que ve quien recién llega. Cinco pasos
// medidos con lo que hizo de verdad, monedas por cada uno y un bono al
// terminar. La primera victoria es una lección de 2 minutos y el último paso
// es volver mañana. Desaparece cuando cobra el bono.

type Step = { key: "lesson" | "exercise" | "avatar" | "startup" | "streak"; coins: number; done: boolean; claimed: boolean };
type Overview = { steps: Step[]; bonus: number; bonusClaimed: boolean; finished: boolean };

const ICONS = { lesson: BookOpen, exercise: Code2, avatar: Shirt, startup: Rocket, streak: Flame } as const;

export function StarterChecklist({ learnHref }: { learnHref: string }) {
  const t = useTranslation();
  const { celebrate } = useReward();
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<Overview>("/starter")
      .then(setData)
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data || data.finished) return null;

  const hrefFor = (key: Step["key"]) => {
    if (key === "lesson" || key === "exercise") return learnHref;
    if (key === "startup") return `${getGameUrl()}?open=codestudio`;
    if (key === "avatar") return getGameUrl();
    return null;
  };

  const claim = async (key: string) => {
    setBusy(key);
    try {
      const result = await api.post<{ coins: number; overview: Overview }>(`/starter/claim/${key}`);
      setData(result.overview);
      celebrate({
        kind: "reward",
        title: key === "bonus" ? t("dashboard.starter.bonusClaimed") : t(`dashboard.starter.step.${key}.title`),
        subtitle: null,
        xp: 0,
        coins: result.coins,
      });
    } catch {
      load();
    } finally {
      setBusy(null);
    }
  };

  const doneCount = data.steps.filter((step) => step.done).length;
  const allClaimed = data.steps.every((step) => step.claimed);
  const next = data.steps.find((step) => !step.done);

  return (
    <section className="mb-6 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 sm:p-6" aria-labelledby="starter-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--primary))]">{t("dashboard.starter.eyebrow")}</p>
          <h2 id="starter-title" className="mt-1 text-2xl font-black tracking-tight">
            {t("dashboard.starter.title")}
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">{t("dashboard.starter.subtitle", { bonus: data.bonus })}</p>
        </div>
        <span className="text-sm font-bold text-[rgb(var(--secondary-text))]">
          {doneCount}/{data.steps.length}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgb(var(--background))]" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={data.steps.length}>
        <div className="h-full rounded-full bg-[rgb(var(--primary))] transition-all" style={{ width: `${(doneCount / data.steps.length) * 100}%` }} />
      </div>

      <ol className="mt-5 grid gap-2">
        {data.steps.map((step) => {
          const Icon = ICONS[step.key];
          const href = hrefFor(step.key);
          const isNext = next?.key === step.key;
          return (
            <li
              key={step.key}
              className={`flex items-center gap-3 rounded-2xl p-3 ${isNext ? "bg-[rgb(var(--primary)/0.10)] ring-1 ring-[rgb(var(--primary)/0.4)]" : "bg-[rgb(var(--background))]"}`}
            >
              <span
                className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${step.done ? "bg-emerald-500/15 text-emerald-500" : "bg-[rgb(var(--card))] text-[rgb(var(--primary))]"}`}
                aria-hidden
              >
                {step.done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-bold ${step.claimed ? "text-[rgb(var(--secondary-text))] line-through" : ""}`}>{t(`dashboard.starter.step.${step.key}.title`)}</span>
                <span className="block text-xs text-[rgb(var(--secondary-text))]">{t(`dashboard.starter.step.${step.key}.text`)}</span>
              </span>
              {step.claimed ? (
                <span className="text-xs font-bold text-emerald-500">{t("dashboard.starter.claimed")}</span>
              ) : step.done ? (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void claim(step.key)}
                  className="inline-flex flex-none items-center gap-1.5 rounded-full bg-[rgb(var(--primary))] px-4 py-2 text-sm font-bold text-black transition hover:opacity-90 disabled:opacity-60"
                >
                  <CurrencyIcon currency="coins" size={14} /> +{step.coins}
                </button>
              ) : href ? (
                <Link
                  href={href}
                  className={`inline-flex flex-none items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${isNext ? "bg-[rgb(var(--primary))] text-black hover:opacity-90" : "border border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]"}`}
                >
                  {t("dashboard.starter.go")} <span className="opacity-70">+{step.coins}</span>
                </Link>
              ) : (
                <span className="inline-flex flex-none items-center gap-1 text-xs font-bold text-[rgb(var(--secondary-text))]">
                  <CurrencyIcon currency="coins" size={12} /> +{step.coins}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {allClaimed && !data.bonusClaimed && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void claim("bonus")}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--primary))] px-5 py-3 font-black text-black transition hover:opacity-90 disabled:opacity-60"
        >
          <Gift className="h-5 w-5" aria-hidden /> {t("dashboard.starter.bonus", { coins: data.bonus })}
        </button>
      )}
    </section>
  );
}
