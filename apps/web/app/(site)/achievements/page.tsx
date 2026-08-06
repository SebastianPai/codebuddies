"use client";

import { useEffect, useState } from "react";
import { Lock, Trophy, Unlock } from "lucide-react";
import { api } from "../../../utils/api";
import GamificationProgress from "../../../components/gamification/GamificationProgress";
import RewardChips from "../../../components/gamification/RewardChips";
import {
  GamificationEmpty,
  GamificationError,
  GamificationSkeleton,
} from "../../../components/gamification/GamificationState";
import type { AchievementsPayload } from "../../../components/gamification/gamification-types";
import { useTranslation } from "../../../src/i18n/useTranslation";

export default function AchievementsPage() {
  const t = useTranslation();
  const [data, setData] = useState<AchievementsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<AchievementsPayload>("/achievements"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("gamification.achievementsLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <GamificationSkeleton />;
  if (error || !data) return <GamificationError message={error ?? t("common.unexpectedError")} onRetry={() => void load()} />;

  return (
    <div className="py-8 text-[rgb(var(--text))]">
      <section className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
        <h1 className="text-4xl font-black">{t("site.achievements")}</h1>
        <p className="mt-2 text-sm text-[rgb(var(--secondary-text))]">
          {t("site.achievementsCollectionDescription")}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label={t("site.totalLabel")} value={data.summary.total} />
          <Metric label={t("site.unlockedLabel")} value={data.summary.unlocked} />
          <Metric label={t("site.lockedLabel")} value={data.summary.locked} />
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.items.length ? (
          data.items.map((achievement) => (
            <article
              key={achievement.id}
              className={`rounded-lg border p-5 ${
                achievement.unlocked
                  ? "border-[rgb(var(--button)/0.4)] bg-[rgb(var(--button)/0.1)]"
                  : "border-[rgb(var(--border))] bg-[rgb(var(--card))]"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                    achievement.unlocked
                      ? "bg-[rgb(var(--button))] text-[rgb(var(--button-text))]"
                      : "bg-[rgb(var(--border))] text-[rgb(var(--secondary-text))]"
                  }`}
                >
                  {achievement.unlocked ? <Unlock size={20} /> : <Lock size={20} />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black">{achievement.name}</h2>
                  <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">{achievement.description}</p>
                </div>
              </div>
              <div className="mt-5">
                <GamificationProgress
                  current={achievement.currentValue}
                  target={achievement.requiredValue}
                  label={`${achievement.currentValue} / ${achievement.requiredValue}`}
                />
              </div>
              <div className="mt-4">
                <RewardChips rewards={achievement.rewards} />
              </div>
            </article>
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3">
            <GamificationEmpty
              title={t("site.noAchievements")}
              description={t("site.achievementsAdminDescription")}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase text-[rgb(var(--secondary-text))]">{label}</span>
        <Trophy size={16} className="text-[rgb(var(--primary))]" />
      </div>
      <p className="mt-2 text-3xl font-black text-[rgb(var(--text))]">{value}</p>
    </div>
  );
}
