"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Coins, Gift, Target, Trophy, Zap } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import MissionCard from "../../../components/gamification/MissionCard";
import GamificationProgress from "../../../components/gamification/GamificationProgress";
import {
  GamificationEmpty,
  GamificationError,
  GamificationSkeleton,
} from "../../../components/gamification/GamificationState";
import type { MissionsPayload } from "../../../components/gamification/gamification-types";
import { useTranslation } from "../../../src/i18n/useTranslation";

export default function MissionsPage() {
  const t = useTranslation();
  const [data, setData] = useState<MissionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<MissionsPayload>("/missions"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("gamification.missionsLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const claim = async (id: string) => {
    setClaimingId(id);
    try {
      await api.post(`/missions/${id}/claim`);
      toast.success(t("gamification.rewardClaimed"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("gamification.claimRewardError"));
    } finally {
      setClaimingId(null);
    }
  };

  const progressLabel = useMemo(
    () =>
      t("gamification.missionsProgressLabel", {
        completed: data?.summary.completed ?? 0,
        total: data?.summary.total ?? 0,
      }),
    [data, t],
  );

  if (loading) return <GamificationSkeleton />;
  if (error || !data) return <GamificationError message={error ?? t("common.unexpectedError")} onRetry={() => void load()} />;

  return (
    <div className="py-8 text-[rgb(var(--text))]">
      <section className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-black">{t("gamification.missions")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--secondary-text))]">
              {t("gamification.missionsPageDescription")}
            </p>
          </div>
          <div className="min-w-65">
            <GamificationProgress
              current={data.summary.completed}
              target={data.summary.total}
              label={progressLabel}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Metric icon={<Target size={16} />} label={t("gamification.completedCount")} value={data.summary.completed} />
          <Metric icon={<Award size={16} />} label={t("gamification.pendingCount")} value={data.summary.pending} />
          <Metric icon={<Zap size={16} />} label="XP" value={data.summary.xpEarned} />
          <Metric icon={<Coins size={16} />} label="Coins" value={data.summary.coinsEarned} />
          <Metric icon={<Gift size={16} />} label={t("gamification.objectsCount")} value={data.summary.objectsEarned} />
          <Metric icon={<Trophy size={16} />} label={t("gamification.levelLabel")} value={data.summary.level} />
          <Metric icon={<Award size={16} />} label={t("gamification.claimedCount")} value={data.summary.claimed} />
        </div>
      </section>

      <section className="mt-6 space-y-4">
        {data.items.length ? (
          data.items.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onClaim={(missionId) => void claim(missionId)}
              claiming={claimingId === mission.id}
            />
          ))
        ) : (
          <GamificationEmpty
            title={t("gamification.noMissionsVisible")}
            description={t("gamification.noMissionsVisibleDescription")}
          />
        )}
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4">
      <div className="flex items-center justify-between text-[rgb(var(--secondary-text))]">
        <span className="text-xs font-black uppercase">{label}</span>
        <span className="text-[rgb(var(--primary))]">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-[rgb(var(--text))]">{value}</p>
    </div>
  );
}
