"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { motion, useReducedMotion } from "framer-motion";
import {
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Crown,
  Gift,
  Lock,
  Sparkles,
  Ticket,
  Trophy,
  Zap,
} from "lucide-react";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { useReward } from "../../../contexts/RewardContext";
import {
  GamificationEmpty,
  GamificationError,
  GamificationSkeleton,
} from "../../../components/gamification/GamificationState";
import { BadgeLogo } from "../../../components/battle-pass/BadgeLogo";
import { rewardLabel } from "../../../components/battle-pass/BattlePassTicket";
import type { BattlePassState, BattlePassTier } from "../../../components/battle-pass/battle-pass-types";
import { useTrackToolUsed, trackToolAction } from "../../../components/analytics/tool-tracking";

const COLUMN_WIDTH = 132; // px por día en el camino (incluye separación)

function useCountdown(endsAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  if (!endsAt) return null;
  const ms = Math.max(0, new Date(endsAt).getTime() - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return { d, h, m, ended: ms === 0 };
}

export default function BattlePassPage() {
  const t = useTranslation();
  const { showReward } = useReward();
  const reduceMotion = useReducedMotion();
  useTrackToolUsed("battle_pass", "gamification");
  const [data, setData] = useState<BattlePassState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.get<BattlePassState>("/battle-pass/me"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("battlePass.loadError"));
    } finally {
      setLoading(false);
    }
    // t fuera a propósito: no recargar al cambiar idioma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const countdown = useCountdown(data?.season?.endsAt);

  const byLevel = useMemo(() => {
    const map = new Map<number, { free: BattlePassTier[]; premium: BattlePassTier[] }>();
    for (const tier of data?.tiers ?? []) {
      const entry = map.get(tier.level) ?? { free: [], premium: [] };
      (tier.track === "FREE" ? entry.free : entry.premium).push(tier);
      map.set(tier.level, entry);
    }
    return map;
  }, [data?.tiers]);

  const claimable = useMemo(() => (data?.tiers ?? []).filter((tier) => tier.claimable), [data?.tiers]);
  const claimedCount = useMemo(() => (data?.tiers ?? []).filter((tier) => tier.claimed).length, [data?.tiers]);

  const scrollToLevel = useCallback(
    (level: number, behavior: ScrollBehavior = "smooth") => {
      const el = trackRef.current;
      if (!el) return;
      const left = (level - 1) * COLUMN_WIDTH - el.clientWidth / 2 + COLUMN_WIDTH / 2;
      el.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? "auto" : behavior });
    },
    [reduceMotion],
  );

  // Al cargar, centrar el día actual en el camino.
  useEffect(() => {
    if (data?.progress) requestAnimationFrame(() => scrollToLevel(data.progress!.level, "auto"));
  }, [data?.progress, scrollToLevel]);

  const rewardValue = (tier: BattlePassTier) => ({
    xp: tier.rewardType === "XP" ? (tier.amount ?? 0) : 0,
    coins: tier.rewardType === "COINS" ? (tier.amount ?? 0) : 0,
  });

  const claim = async (tier: BattlePassTier) => {
    setClaimingId(tier.id);
    try {
      await api.post(`/battle-pass/claim/${tier.id}`);
      trackToolAction("battle_pass", "gamification", "claim_tier");
      const value = rewardValue(tier);
      if (value.xp || value.coins) showReward(value);
      else toast.success(t("battlePass.claimSuccess"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("battlePass.claimError"));
    } finally {
      setClaimingId(null);
    }
  };

  const claimAll = async () => {
    setClaimingId("all");
    let xp = 0;
    let coins = 0;
    for (const tier of claimable) {
      try {
        await api.post(`/battle-pass/claim/${tier.id}`);
        const value = rewardValue(tier);
        xp += value.xp;
        coins += value.coins;
      } catch {
        /* sigue con el resto */
      }
    }
    trackToolAction("battle_pass", "gamification", "claim_all");
    if (xp || coins) showReward({ xp, coins });
    else toast.success(t("battlePass.claimSuccess"));
    await load();
    setClaimingId(null);
  };

  if (loading) return <GamificationSkeleton />;
  if (error) return <GamificationError message={error} onRetry={() => void load()} />;

  if (!data || !data.season || !data.progress) {
    return (
      <div className="py-8">
        <GamificationEmpty title={t("battlePass.noActiveSeason")} description={t("battlePass.noActiveSeasonDescription")} />
      </div>
    );
  }

  const { season, progress, hasPremium } = data;
  const daily = progress.mode === "DAILY";
  const total = progress.totalLevels;
  const percent = Math.round((progress.level / Math.max(total, 1)) * 100);
  const nextTiers = byLevel.get(progress.level + 1);
  const nextReward = nextTiers?.free[0] ?? (hasPremium ? nextTiers?.premium[0] : undefined);
  const days = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="py-6 text-[rgb(var(--text))] sm:py-8">
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[rgb(var(--primary)/0.22)] blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(var(--border)/0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--border)/0.25)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_at_top_right,#000_20%,transparent_70%)]" />
        </div>

        <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.1)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[rgb(var(--primary))]">
              <Ticket size={13} /> {t("battlePass.title")} · #{season.seasonNumber}
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl">{season.name}</h1>
            <p className="mt-3 max-w-xl text-sm text-[rgb(var(--secondary-text))] sm:text-base">
              {daily ? t("battlePass.page.howItWorks") : t("battlePass.pageDescription")}
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
              {countdown && !countdown.ended && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-1.5">
                  <Clock size={13} className="text-[rgb(var(--primary))]" />
                  {t("battlePass.page.endsIn", {
                    time:
                      countdown.d > 0
                        ? t("battlePass.page.daysHours", { d: countdown.d, h: countdown.h })
                        : t("battlePass.page.hoursMinutes", { h: countdown.h, m: countdown.m }),
                  })}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-1.5">
                <Trophy size={13} className="text-[rgb(var(--primary))]" />
                {claimedCount} {t("battlePass.page.claimedCount")}
              </span>
              {hasPremium && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/40 bg-purple-500/15 px-3 py-1.5 text-purple-200">
                  <Crown size={13} /> Premium
                </span>
              )}
            </div>
          </div>

          {/* Medidor */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background)/0.7)] p-5 backdrop-blur">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--secondary-text))]">
                  {t(daily ? "battlePass.day" : "battlePass.level")}
                </p>
                <p className="text-5xl font-black leading-none">
                  {progress.level}
                  <span className="text-xl text-[rgb(var(--secondary-text))]">/{total}</span>
                </p>
              </div>
              <p className="text-right text-xs text-[rgb(var(--secondary-text))]">
                {percent}%<br />
                {daily ? t("battlePass.page.daysUnlocked") : ""}
              </p>
            </div>
            <div
              className="mt-4 h-3 overflow-hidden rounded-full bg-[rgb(var(--border))]"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("battlePass.seasonProgress")}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(percent, 3)}%` }}
                transition={{ duration: reduceMotion ? 0 : 1, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-[rgb(var(--primary))] to-amber-300 shadow-[0_0_16px_rgb(var(--primary)/0.6)]"
              />
            </div>
            {!progress.isMaxLevel && nextReward && (
              <p className="mt-3 flex items-center gap-2 text-xs text-[rgb(var(--secondary-text))]">
                <Sparkles size={13} className="text-[rgb(var(--primary))]" />
                {daily ? t("battlePass.page.tomorrow") : t("battlePass.page.nextUnlock")}:{" "}
                <span className="truncate font-bold text-[rgb(var(--text))]">{rewardLabel(t, nextReward)}</span>
              </p>
            )}
            {claimable.length > 0 && (
              <button
                type="button"
                onClick={() => void claimAll()}
                disabled={claimingId !== null}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[rgb(var(--button))] px-4 py-3 text-sm font-black uppercase tracking-wide text-[rgb(var(--button-text))] shadow-[0_8px_24px_rgb(var(--primary)/0.35)] transition hover:brightness-110 disabled:opacity-60"
              >
                <Gift size={16} />
                {claimingId === "all" ? t("battlePass.claiming") : t("battlePass.page.claimAll", { count: claimable.length })}
              </button>
            )}
          </div>
        </div>
      </section>

      {!hasPremium && (
        <Link
          href="/premium"
          className="group mt-4 flex flex-col gap-3 rounded-2xl border border-purple-400/40 bg-gradient-to-r from-purple-600/20 via-purple-500/10 to-transparent p-4 transition hover:border-purple-300/70 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/25 text-purple-200">
              <Crown size={20} />
            </span>
            <span className="text-sm">
              <b className="block">{t("battlePass.unlockPremium")}</b>
              <span className="text-[rgb(var(--secondary-text))]">{t("battlePass.page.premiumPitch")}</span>
            </span>
          </span>
          <span className="inline-flex items-center justify-center gap-1 rounded-full bg-purple-500 px-4 py-2 text-xs font-black text-white transition group-hover:translate-x-0.5">
            {t("battlePass.viewPremiumPlans")} <ChevronRight size={14} />
          </span>
        </Link>
      )}

      {/* ---------- Camino de días ---------- */}
      <section className="mt-6 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wide text-[rgb(var(--secondary-text))]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--primary))]" /> {t("battlePass.freeTrack")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-400" /> {t("battlePass.premiumTrack")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollToLevel(progress.level)}
              className="rounded-full border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-bold transition hover:border-[rgb(var(--primary)/0.6)]"
            >
              {t("battlePass.page.jumpToday")}
            </button>
            <button
              type="button"
              aria-label={t("battlePass.page.previous")}
              onClick={() => trackRef.current?.scrollBy({ left: -COLUMN_WIDTH * 4, behavior: "smooth" })}
              className="hidden rounded-full border border-[rgb(var(--border))] p-1.5 transition hover:border-[rgb(var(--primary)/0.6)] sm:block"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label={t("battlePass.page.next")}
              onClick={() => trackRef.current?.scrollBy({ left: COLUMN_WIDTH * 4, behavior: "smooth" })}
              className="hidden rounded-full border border-[rgb(var(--border))] p-1.5 transition hover:border-[rgb(var(--primary)/0.6)] sm:block"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div ref={trackRef} className="relative overflow-x-auto pb-3 [scrollbar-width:thin]" style={{ scrollSnapType: "x proximity" }}>
          <div className="relative flex" style={{ width: days.length * COLUMN_WIDTH }}>
            {/* línea de progreso detrás de los nodos */}
            <div className="absolute left-0 right-0 top-[210px] h-1 rounded-full bg-[rgb(var(--border))]" />
            <div
              className="absolute left-0 top-[210px] h-1 rounded-full bg-gradient-to-r from-[rgb(var(--primary))] to-amber-300"
              style={{ width: Math.max(0, (progress.level - 0.5) * COLUMN_WIDTH) }}
            />
            {days.map((day) => {
              const entry = byLevel.get(day);
              const reached = day <= progress.level;
              const isToday = day === progress.level;
              return (
                <div key={day} className="relative flex shrink-0 flex-col items-center gap-6 px-1.5" style={{ width: COLUMN_WIDTH, scrollSnapAlign: "center" }}>
                  <RewardCard tiers={entry?.free ?? []} premium={false} claimingId={claimingId} onClaim={claim} />
                  <div
                    className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black ${
                      isToday
                        ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-[rgb(var(--button-text))] shadow-[0_0_0_6px_rgb(var(--primary)/0.2)]"
                        : reached
                          ? "border-[rgb(var(--primary))] bg-[rgb(var(--card))] text-[rgb(var(--primary))]"
                          : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--secondary-text))]"
                    }`}
                  >
                    {day}
                    {isToday && (
                      <span className="absolute -top-[26px] whitespace-nowrap rounded-full bg-[rgb(var(--primary))] px-2 py-0.5 text-[10px] font-black uppercase text-[rgb(var(--button-text))]">
                        {t("battlePass.page.today")}
                      </span>
                    )}
                  </div>
                  <RewardCard tiers={entry?.premium ?? []} premium claimingId={claimingId} onClaim={claim} />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function RewardVisual({ tier, size = 44 }: { tier: BattlePassTier; size?: number }) {
  if (tier.badgeIcon) return <BadgeLogo icon={tier.badgeIcon} height={size - 8} />;
  if (tier.item?.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={tier.item.imageUrl} alt="" className="max-h-full max-w-full object-contain" style={{ height: size, imageRendering: "pixelated" }} />
    );
  }
  const icon =
    tier.rewardType === "COINS" ? <Coins size={22} /> :
    tier.rewardType === "XP" ? <Zap size={22} /> :
    tier.rewardType === "BADGE" ? <Award size={22} /> :
    tier.rewardType === "TITLE" ? <Crown size={22} /> :
    <Gift size={22} />;
  return <span className="text-[rgb(var(--primary))]">{icon}</span>;
}

function RewardCard({
  tiers,
  premium,
  claimingId,
  onClaim,
}: {
  tiers: BattlePassTier[];
  premium: boolean;
  claimingId: string | null;
  onClaim: (tier: BattlePassTier) => void;
}) {
  const t = useTranslation();
  const tier = tiers[0];
  const accent = premium ? "purple" : "primary";

  if (!tier) {
    return (
      <div className="flex h-[168px] w-full items-center justify-center rounded-2xl border border-dashed border-[rgb(var(--border)/0.6)] text-[10px] uppercase text-[rgb(var(--secondary-text)/0.6)]">
        {t("battlePass.page.empty")}
      </div>
    );
  }

  const locked = !tier.levelReached || !tier.trackUnlocked;
  const state = tier.claimed ? "claimed" : tier.claimable ? "claimable" : locked ? "locked" : "idle";
  const border =
    state === "claimable"
      ? accent === "purple"
        ? "border-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.35)]"
        : "border-[rgb(var(--primary))] shadow-[0_0_24px_rgb(var(--primary)/0.35)]"
      : state === "claimed"
        ? "border-[rgb(var(--success)/0.6)]"
        : "border-[rgb(var(--border))]";
  const bg = accent === "purple" ? "from-purple-500/15" : "from-[rgb(var(--primary)/0.12)]";

  return (
    <div
      className={`relative flex h-[168px] w-full flex-col items-center justify-between rounded-2xl border bg-gradient-to-b ${bg} to-transparent p-2.5 text-center transition ${border} ${
        state === "locked" ? "opacity-55" : ""
      }`}
    >
      {premium && (
        <Crown size={12} className="absolute left-2 top-2 text-purple-300" aria-hidden />
      )}
      {tiers.length > 1 && (
        <span className="absolute right-2 top-2 rounded-full bg-[rgb(var(--background))] px-1.5 text-[10px] font-black">+{tiers.length - 1}</span>
      )}
      <div className="relative mt-3 flex h-12 w-full items-center justify-center">
        <RewardVisual tier={tier} />
        {state === "claimed" && (
          <span className="absolute -bottom-1 right-5 flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(var(--success))] text-white">
            <Check size={12} />
          </span>
        )}
        {state === "locked" && (
          <span className="absolute -bottom-1 right-5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-white">
            <Lock size={10} />
          </span>
        )}
      </div>
      <p className="line-clamp-2 min-h-[2.2rem] text-[11px] font-bold leading-tight">{rewardLabel(t, tier)}</p>
      {state === "claimable" ? (
        <button
          type="button"
          onClick={() => onClaim(tier)}
          disabled={claimingId !== null}
          className={`w-full rounded-lg px-2 py-1.5 text-[11px] font-black uppercase transition hover:brightness-110 disabled:opacity-60 ${
            premium ? "bg-purple-500 text-white" : "bg-[rgb(var(--button))] text-[rgb(var(--button-text))]"
          }`}
        >
          {claimingId === tier.id ? t("battlePass.claiming") : t("battlePass.claim")}
        </button>
      ) : (
        <span className="text-[10px] font-bold uppercase text-[rgb(var(--secondary-text))]">
          {state === "claimed"
            ? t("battlePass.claimed")
            : !tier.trackUnlocked
              ? "Premium"
              : t("battlePass.locked")}
        </span>
      )}
    </div>
  );
}
