"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Gift,
  Link2,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { api } from "../../../utils/api";
import ReferralMetricCard from "../../../components/referrals/ReferralMetricCard";
import ReferralProgressBar from "../../../components/referrals/ReferralProgressBar";
import ReferralShareButtons from "../../../components/referrals/ReferralShareButtons";
import ReferralUserTable from "../../../components/referrals/ReferralUserTable";
import ReferralRewardHistory from "../../../components/referrals/ReferralRewardHistory";
import ReferralEmptyState from "../../../components/referrals/ReferralEmptyState";
import { ReferralPageSkeleton } from "../../../components/referrals/ReferralSkeleton";
import type {
  ReferralGrant,
  ReferralOverview,
} from "../../../components/referrals/referral-types";
import { useTranslation } from "../../../src/i18n/useTranslation";

export default function ReferralsPage() {
  const t = useTranslation();
  const [overview, setOverview] = useState<ReferralOverview | null>(null);
  const [history, setHistory] = useState<ReferralGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [overviewData, historyData] = await Promise.all([
        api.get<ReferralOverview>("/referrals/me"),
        api.get<ReferralGrant[]>("/referrals/me/history"),
      ]);

      setOverview(overviewData);
      setHistory(historyData);
    } catch (err) {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: string }).message)
          : t("referrals.loadError");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totalReferrals = useMemo(() => {
    if (!overview) return 0;
    return overview.referrals.length;
  }, [overview]);

  if (loading) {
    return <ReferralPageSkeleton />;
  }

  if (error || !overview) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-white md:px-8">
        <div className="mx-auto max-w-6xl">
          <ReferralEmptyState
            title={t("referrals.loadErrorTitle")}
            description={error ?? t("referrals.loadErrorDescription")}
            action={
              <button
                type="button"
                onClick={() => void loadData()}
                className="rounded-2xl bg-[#d5ff3f] px-4 py-3 font-bold text-black"
              >
                {t("gamification.retry")}
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const target = overview.nextReward?.threshold ?? Math.max(overview.stats.validated, 1);
  const missing = Math.max(target - overview.stats.validated, 0);
  const shareMessage =
    overview.config?.shareMessage ??
    t("referrals.shareMessageTemplate", { code: overview.profile.referralCode });
  const nextRewardLabel =
    overview.nextReward?.name ??
    t("referrals.allRewardsReached");
  const nextRewardHelper = overview.nextReward
    ? missing > 0
      ? t("referrals.missingForReward", { missing, reward: nextRewardLabel })
      : t("referrals.alreadyReachedMilestone", { reward: nextRewardLabel })
    : t("referrals.noMoreMilestones");
  const nextRewardDetails = overview.nextReward
    ? [
        overview.nextReward.amount
          ? `${overview.nextReward.amount} ${overview.nextReward.rewardType ?? "reward"}`
          : null,
        overview.nextReward.item?.translations?.[0]?.name,
      ].filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[32px] border border-white/10 bg-[#111111] p-6 md:p-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d5ff3f]/30 bg-[#d5ff3f]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-[#d5ff3f]">
                <Sparkles size={14} />
                {t("referrals.programBadge")}
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
                {t("referrals.heroTitle")}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
                {t("referrals.heroDescription")}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-[#d5ff3f] hover:text-[#d5ff3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d5ff3f]"
            >
              <ArrowLeft size={16} />
              {t("referrals.backToDashboard")}
            </Link>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-3xl border border-white/10 bg-black p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-white/45">
                {t("referrals.referralCodeLabel")}
              </p>
              <p className="mt-3 break-words text-4xl font-black text-[#d5ff3f] md:text-5xl">
                {overview.profile.referralCode}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-white/45">
                {t("referrals.customUrlLabel")}
              </p>
              <p className="mt-3 break-all font-mono text-sm text-white/80">
                {overview.profile.referralLink}
              </p>
              <div className="mt-5">
                <ReferralShareButtons
                  code={overview.profile.referralCode}
                  link={overview.profile.referralLink}
                  message={shareMessage}
                />
              </div>
            </div>
          </div>
        </motion.section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <ReferralMetricCard
            icon={<Users size={18} />}
            label={t("referrals.referralsMetricLabel")}
            value={totalReferrals}
            helper={t("referrals.totalRegisteredHelper")}
          />
          <ReferralMetricCard
            icon={<Users size={18} />}
            label={t("gamification.pendingCount")}
            value={overview.stats.pending}
          />
          <ReferralMetricCard
            icon={<Award size={18} />}
            label={t("referrals.validatedMetricLabel")}
            value={overview.stats.validated}
          />
          <ReferralMetricCard
            icon={<Gift size={18} />}
            label={t("referrals.rewardsMetricLabel")}
            value={history.length}
            helper={t("referrals.rewardsReceivedHelper")}
          />
          <ReferralMetricCard
            icon={<Trophy size={18} />}
            label={t("referrals.rankingMetricLabel")}
            value={
              overview.leaderboard.currentRank?.currentRank
                ? `#${overview.leaderboard.currentRank.currentRank}`
                : "-"
            }
            helper={overview.leaderboard.season?.name ?? t("referrals.noActiveSeasonHelper")}
          />
          <ReferralMetricCard
            icon={<Link2 size={18} />}
            label={t("referrals.nextMilestoneLabel")}
            value={overview.nextReward?.threshold ?? "-"}
            helper={nextRewardLabel}
          />
        </section>

        {overview.incomingReferral ? (
          <section className="mt-6 rounded-[32px] border border-[#d5ff3f]/30 bg-[#d5ff3f]/10 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-2xl font-black">
                  {t("referrals.yourReferralRegistrationTitle")}
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  {t("referrals.invitedByDescription", { username: overview.incomingReferral.referrer.username })}
                </p>
              </div>
              <span className="rounded-full bg-black px-4 py-2 text-sm font-black text-[#d5ff3f]">
                {overview.incomingReferral.completed
                  ? t("referrals.readyToValidate")
                  : t("referrals.pendingCountSuffix", { count: overview.incomingReferral.missing.length })}
              </span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {overview.incomingReferral.requirements.map((requirement) => (
                <div
                  key={requirement.key}
                  className="rounded-2xl border border-white/10 bg-black p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{requirement.label}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        requirement.completed
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-yellow-400/10 text-yellow-300"
                      }`}
                    >
                      {requirement.completed ? t("referrals.completedMasculine") : t("gamification.pending")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/50">
                    {t("referrals.progressOfLabel", { current: requirement.current, target: Math.max(requirement.target, 1) })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-[#111111] p-6">
              <h2 className="text-2xl font-black">{t("referrals.programProgressTitle")}</h2>
              <p className="mt-2 text-sm text-white/55">
                {t("referrals.programProgressDescription")}
              </p>
              <div className="mt-5">
                <ReferralProgressBar
                  current={overview.stats.validated}
                  target={target}
                  title={t("referrals.nextRewardTitle")}
                  subtitle={nextRewardHelper}
                />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black p-4">
                  <p className="text-xs font-black uppercase text-white/40">{t("referrals.currentCountLabel")}</p>
                  <p className="mt-2 text-2xl font-black">{overview.stats.validated}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black p-4">
                  <p className="text-xs font-black uppercase text-white/40">{t("referrals.missingCountLabel")}</p>
                  <p className="mt-2 text-2xl font-black">{missing}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black p-4">
                  <p className="text-xs font-black uppercase text-white/40">
                    {t("referrals.nextRewardLabel2")}
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#d5ff3f]">
                    {nextRewardDetails.length
                      ? nextRewardDetails.join(" + ")
                      : nextRewardLabel}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-[#111111] p-6">
              <h2 className="text-2xl font-black">{t("referrals.rewardTreeTitle")}</h2>
              <p className="mt-2 text-sm text-white/55">
                {t("referrals.rewardTreeDescription")}
              </p>
              <div className="mt-5 space-y-3">
                {overview.rewardTree?.length ? (
                  overview.rewardTree.map((reward) => (
                    <div
                      key={reward.id}
                      className={`rounded-2xl border p-4 ${
                        reward.progressState === "CURRENT"
                          ? "border-[#d5ff3f]/50 bg-[#d5ff3f]/10"
                          : "border-white/10 bg-black"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-black uppercase text-white/45">
                            {reward.threshold ?? 0}{" "}
                            {t(reward.threshold === 1 ? "referrals.referralUnitSingular" : "referrals.referralUnitPlural")}
                          </p>
                          <h3 className="mt-1 text-lg font-black">{reward.name}</h3>
                          <p className="mt-1 text-sm text-white/55">
                            {[
                              reward.amount
                                ? `${reward.amount} ${reward.rewardType}`
                                : null,
                              reward.item?.translations?.[0]?.name,
                            ]
                              .filter(Boolean)
                              .join(" + ") ||
                              reward.description ||
                              t("referrals.rewardConfiguredFallback")}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-[#d5ff3f]">
                          {reward.progressState === "COMPLETED" ? (
                            <CheckCircle2 size={14} />
                          ) : null}
                          {reward.progressState === "COMPLETED"
                            ? t("gamification.completed")
                            : reward.progressState === "CURRENT"
                              ? t("referrals.currentState")
                              : t("referrals.nextState")}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <ReferralEmptyState
                    title={t("referrals.noRewardTreeTitle")}
                    description={t("referrals.noRewardTreeDescription")}
                  />
                )}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-[#111111] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">{t("referrals.yourReferralsTitle")}</h2>
                  <p className="mt-2 text-sm text-white/55">
                    {t("referrals.yourReferralsDescription")}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                {overview.referrals.length ? (
                  <ReferralUserTable referrals={overview.referrals} history={history} />
                ) : (
                  <ReferralEmptyState
                    title={t("referrals.noReferralsYetTitle")}
                    description={t("referrals.noReferralsYetDescription")}
                  />
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-[#111111] p-6">
              <h2 className="text-2xl font-black">{t("referrals.monthlyRankingTitle")}</h2>
              <p className="mt-2 text-sm text-white/55">
                {t("referrals.currentSeasonLabel", { season: overview.leaderboard.season?.name ?? t("referrals.noActiveSeasonHelper") })}
              </p>
              <div className="mt-5 space-y-3">
                {overview.leaderboard.top.length ? (
                  overview.leaderboard.top.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black px-4 py-3"
                    >
                      <div>
                        <p className="font-bold">
                          #{entry.currentRank} {entry.user.username}
                        </p>
                        <p className="text-sm text-white/50">
                          {t("referrals.validCountSuffix", { count: entry.validatedReferrals })}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#d5ff3f]/10 px-3 py-1 text-xs font-black text-[#d5ff3f]">
                        {t("referrals.levelBadge", { level: entry.user.level ?? 0 })}
                      </span>
                    </div>
                  ))
                ) : (
                  <ReferralEmptyState
                    title={t("referrals.noRankingTitle")}
                    description={t("referrals.noRankingDescription")}
                  />
                )}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-[#111111] p-6">
              <h2 className="text-2xl font-black">{t("referrals.rewardHistoryTitle")}</h2>
              <p className="mt-2 text-sm text-white/55">
                {t("referrals.rewardHistoryDescription")}
              </p>
              <div className="mt-5">
                {history.length ? (
                  <ReferralRewardHistory history={history} />
                ) : (
                  <ReferralEmptyState
                    title={t("referrals.noRewardsYetTitle")}
                    description={t("referrals.noRewardsYetDescription")}
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
