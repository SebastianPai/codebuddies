"use client";

import { useEffect, useState } from "react";
import { Award, Lock } from "lucide-react";
import { api } from "../../../utils/api";
import {
  GamificationEmpty,
  GamificationError,
  GamificationSkeleton,
} from "../../../components/gamification/GamificationState";
import { useTranslation } from "../../../src/i18n/useTranslation";

interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  rarity: string | null;
  earned: boolean;
}

interface Title {
  id: string;
  name: string;
  description: string | null;
  rarity: string | null;
  earned: boolean;
}

export default function BadgesPage() {
  const t = useTranslation();
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [titles, setTitles] = useState<Title[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [badgeData, titleData] = await Promise.all([
        api.get<Badge[]>("/badges"),
        api.get<Title[]>("/titles"),
      ]);
      setBadges(badgeData);
      setTitles(titleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.unexpectedError"));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (error) return <GamificationError message={error} onRetry={() => void load()} />;
  if (badges === null || titles === null) return <GamificationSkeleton />;

  return (
    <div className="py-8 text-[rgb(var(--text))]">
      <section className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
        <h1 className="text-4xl font-black">{t("site.badgesTitle")}</h1>
        <p className="mt-2 text-sm text-[rgb(var(--secondary-text))]">{t("site.badgesDescription")}</p>
      </section>

      <section className="mt-6">
        {badges.length === 0 ? (
          <GamificationEmpty title={t("site.badgesEmpty")} description={t("site.badgesEmptyDescription")} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {badges.map((badge) => (
              <article
                key={badge.id}
                className={`rounded-lg border p-5 ${
                  badge.earned
                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--card))]"
                    : "border-[rgb(var(--border))] bg-[rgb(var(--card)/0.6)] opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]">
                    {badge.earned ? <Award size={20} /> : <Lock size={20} />}
                  </div>
                  <div>
                    <h3 className="font-black">{badge.name}</h3>
                    {badge.description && (
                      <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">{badge.description}</p>
                    )}
                    {badge.rarity && (
                      <span className="mt-2 inline-block rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-[10px] font-bold uppercase text-[rgb(var(--secondary-text))]">
                        {badge.rarity}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {titles.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-black">{t("site.titlesTitle")}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {titles.map((title) => (
              <article
                key={title.id}
                className={`rounded-lg border p-5 ${
                  title.earned
                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--card))]"
                    : "border-[rgb(var(--border))] bg-[rgb(var(--card)/0.6)] opacity-60"
                }`}
              >
                <h3 className="font-black">{title.name}</h3>
                {title.description && (
                  <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">{title.description}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
