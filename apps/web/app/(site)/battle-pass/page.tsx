"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Crown, Sparkles, Trophy } from "lucide-react";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";
import {
  GamificationEmpty,
  GamificationError,
  GamificationSkeleton,
} from "../../../components/gamification/GamificationState";
import { BattlePassTicket } from "../../../components/battle-pass/BattlePassTicket";
import type { BattlePassState, BattlePassTier } from "../../../components/battle-pass/battle-pass-types";
import { useTrackToolUsed, trackToolAction } from "../../../components/analytics/tool-tracking";

export default function BattlePassPage() {
  const t = useTranslation();
  useTrackToolUsed("battle_pass", "gamification");
  const [data, setData] = useState<BattlePassState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<BattlePassState>("/battle-pass/me"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("battlePass.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const claim = async (tierId: string) => {
    setClaimingId(tierId);
    try {
      await api.post(`/battle-pass/claim/${tierId}`);
      trackToolAction("battle_pass", "gamification", "claim_tier");
      toast.success(t("battlePass.claimSuccess"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("battlePass.claimError"));
    } finally {
      setClaimingId(null);
    }
  };

  const daysRemaining = useMemo(() => {
    if (!data?.season) return 0;
    const end = new Date(data.season.endsAt).getTime();
    return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [data]);

  if (loading) return <GamificationSkeleton />;
  if (error) return <GamificationError message={error} onRetry={() => void load()} />;

  if (!data || !data.season || !data.progress) {
    return (
      <div className="py-8">
        <GamificationEmpty
          title={t("battlePass.noActiveSeason")}
          description={t("battlePass.noActiveSeasonDescription")}
        />
      </div>
    );
  }

  const { season, progress, hasPremium, tiers } = data;
  const freeTiers = [...tiers].filter((tier) => tier.track === "FREE").sort((a, b) => a.level - b.level);
  const premiumTiers = [...tiers].filter((tier) => tier.track === "PREMIUM").sort((a, b) => a.level - b.level);
  const levelPercentage = progress.isMaxLevel
    ? 100
    : Math.min(100, Math.round((progress.xpIntoLevel / Math.max(progress.xpPerLevel, 1)) * 100));

  return (
    <div className="py-8 text-[rgb(var(--text))]">
      <section className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="text-[rgb(var(--primary))]" size={28} aria-hidden="true" />
              <h1 className="text-4xl font-black">{season.name}</h1>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--secondary-text))]">
              {t("battlePass.pageDescription")}
            </p>
            <p className="mt-1 text-xs font-semibold text-[rgb(var(--secondary-text))]">
              {daysRemaining > 1
                ? t("battlePass.daysRemaining", { count: daysRemaining })
                : daysRemaining === 1
                  ? t("battlePass.dayRemaining")
                  : t("battlePass.seasonEnded")}
            </p>
          </div>

          <div className="min-w-65 space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm font-black">
              <span>
                {t("battlePass.level")} {progress.level} / {progress.totalLevels}
              </span>
              <span className="text-xs font-semibold text-[rgb(var(--secondary-text))]">
                {progress.isMaxLevel
                  ? t("battlePass.maxLevel")
                  : t("battlePass.xpToNextLevel", {
                      current: progress.xpIntoLevel,
                      target: progress.xpPerLevel,
                    })}
              </span>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full bg-[rgb(var(--border))]"
              role="progressbar"
              aria-valuenow={levelPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("battlePass.seasonProgress")}
            >
              <div
                className="h-full rounded-full bg-[rgb(var(--button))] transition-all duration-500"
                style={{ width: `${levelPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {!hasPremium && (
          <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-[rgb(var(--primary))]/30 bg-[rgb(var(--primary)/0.06)] p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Crown className="shrink-0 text-[rgb(var(--primary))]" size={22} aria-hidden="true" />
              <div>
                <p className="text-sm font-black">{t("battlePass.unlockPremium")}</p>
                <p className="text-xs text-[rgb(var(--secondary-text))]">{t("battlePass.unlockPremiumCta")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/premium"
                className="flex items-center gap-1.5 rounded-full bg-[rgb(var(--primary))] px-4 py-2 text-xs font-bold text-[rgb(var(--button-text))] transition-transform hover:scale-[1.03]"
              >
                <Sparkles size={14} aria-hidden="true" />
                {t("battlePass.viewPremiumPlans")}
              </a>
            </div>
          </div>
        )}
      </section>

      <BattlePassTrackSection
        title={t("battlePass.freeTrack")}
        tiers={freeTiers}
        claimingId={claimingId}
        onClaim={(id) => void claim(id)}
      />

      <BattlePassTrackSection
        title={t("battlePass.premiumTrack")}
        tiers={premiumTiers}
        claimingId={claimingId}
        onClaim={(id) => void claim(id)}
        highlight
      />
    </div>
  );
}

function BattlePassTrackSection({
  title,
  tiers,
  claimingId,
  onClaim,
  highlight,
}: {
  title: string;
  tiers: BattlePassTier[];
  claimingId: string | null;
  onClaim: (id: string) => void;
  highlight?: boolean;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        {highlight && <Crown size={18} className="text-[rgb(var(--primary))]" aria-hidden="true" />}
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {tiers.map((tier) => (
          <BattlePassTicket key={tier.id} tier={tier} claiming={claimingId === tier.id} onClaim={onClaim} />
        ))}
      </div>
    </section>
  );
}
