"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Award,
  Check,
  ChevronRight,
  Coins,
  Crown,
  Flame,
  Gift,
  LayoutGrid,
  Lock,
  Target,
  Ticket,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../utils/api";
import { useAuth } from "../../hooks/useAuth";
import { useReward } from "../../contexts/RewardContext";
import { useTranslation } from "../../src/i18n/useTranslation";
import { BadgeLogo } from "../battle-pass/BadgeLogo";
import { rewardLabel } from "../battle-pass/BattlePassTicket";
import type { BattlePassTier } from "../battle-pass/battle-pass-types";
import type { RewardConfig } from "../gamification/gamification-types";

type StreakMilestone = {
  id: string;
  name: string;
  description: string;
  requiredValue: number;
  rewards: RewardConfig[];
  status: "LOCKED" | "CLAIMABLE" | "CLAIMED";
};

type HubPayload = {
  unlockedToday: boolean;
  claimableCount: number;
  battlePass: {
    seasonName: string;
    endsAt: string;
    mode?: "XP" | "DAILY";
    level: number;
    totalLevels: number;
    isMaxLevel: boolean;
    hasPremium: boolean;
    claimable: BattlePassTier[];
    next: BattlePassTier[];
    lockedPremium: number;
  } | null;
  streak: { current: number; best: number; milestones: StreakMilestone[] };
};

type Tab = "pass" | "streak" | "more";

// Día local (no UTC) para "ya descarté la burbuja hoy".
function localDayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* modo privado: la burbuja simplemente vuelve a salir */
  }
}

const BUBBLE_KEY = "cb:rewards-hub:bubble-dismissed";
const BUBBLE_AUTO_HIDE_MS = 12000;

// Punto único de entrada a las recompensas (pase + racha + accesos a
// misiones/logros/insignias), en vez de sumar más menús al navbar:
//  - un botón flotante chico abajo a la izquierda (el chat vive a la derecha)
//  - una burbuja al iniciar sesión cuando hay algo nuevo, que se va sola
//  - un panel tipo menú de videojuego: hoja inferior en móvil, tarjeta
//    flotante en tablet/PC.
export default function RewardsHub() {
  const t = useTranslation();
  const pathname = usePathname() ?? "";
  const { user, isAuthenticated } = useAuth();
  const { showReward } = useReward();
  const reduceMotion = useReducedMotion();
  const userId = user?.userId ?? "";

  const [data, setData] = useState<HubPayload | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("pass");
  const [bubble, setBubble] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const payload = await api.get<HubPayload>("/battle-pass/hub");
      setData(payload);
      setError(false);
      return payload;
    } catch {
      setError(true);
      return null;
    }
  }, []);

  // Una sola vez por carga de página y usuario (el layout no se remonta
  // al navegar). El endpoint además cuenta el día del pase diario.
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setData(null);
      return;
    }
    let cancelled = false;
    void load().then((payload) => {
      if (cancelled || !payload) return;
      const dismissedToday = readStorage(BUBBLE_KEY) === `${userId}:${localDayKey()}`;
      if (!dismissedToday && (payload.unlockedToday || payload.claimableCount > 0)) {
        setBubble(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, load]);

  useEffect(() => {
    if (!bubble) return;
    const timer = window.setTimeout(() => setBubble(false), BUBBLE_AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [bubble]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const dismissBubble = () => {
    setBubble(false);
    writeStorage(BUBBLE_KEY, `${userId}:${localDayKey()}`);
  };

  const openHub = (initialTab?: Tab) => {
    dismissBubble();
    if (initialTab) setTab(initialTab);
    else if (data && !data.battlePass?.claimable.length && data.streak.milestones.some((m) => m.status === "CLAIMABLE")) {
      setTab("streak");
    }
    setOpen(true);
  };

  const claimTier = async (tier: BattlePassTier) => {
    setBusy(tier.id);
    try {
      await api.post(`/battle-pass/claim/${tier.id}`);
      showReward({
        xp: tier.rewardType === "XP" ? (tier.amount ?? 0) : 0,
        coins: tier.rewardType === "COINS" ? (tier.amount ?? 0) : 0,
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("battlePass.claimError"));
    } finally {
      setBusy(null);
    }
  };

  const claimAll = async () => {
    const tiers = data?.battlePass?.claimable ?? [];
    if (!tiers.length) return;
    setBusy("all");
    let xp = 0;
    let coins = 0;
    for (const tier of tiers) {
      try {
        await api.post(`/battle-pass/claim/${tier.id}`);
        if (tier.rewardType === "XP") xp += tier.amount ?? 0;
        if (tier.rewardType === "COINS") coins += tier.amount ?? 0;
      } catch {
        /* sigue con el resto; el que falló queda visible para reintentar */
      }
    }
    if (xp || coins) showReward({ xp, coins });
    else toast.success(t("battlePass.claimSuccess"));
    await load();
    setBusy(null);
  };

  const claimMilestone = async (milestone: StreakMilestone) => {
    setBusy(milestone.id);
    try {
      await api.patch(`/achievements/${milestone.id}/unlock`);
      const xp = milestone.rewards
        .filter((r) => String(r.type).toUpperCase() === "XP")
        .reduce((sum, r) => sum + (r.amount ?? 0), 0);
      const coins = milestone.rewards
        .filter((r) => String(r.type).toUpperCase() === "COINS")
        .reduce((sum, r) => sum + (r.amount ?? 0), 0);
      if (xp || coins) showReward({ xp, coins });
      else toast.success(t("battlePass.claimSuccess"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("battlePass.claimError"));
    } finally {
      setBusy(null);
    }
  };

  const count = data?.claimableCount ?? 0;
  const bubbleText = useMemo(() => {
    if (!data) return "";
    if (data.unlockedToday && data.battlePass?.mode === "DAILY") {
      return t("battlePass.hub.bubbleNewDay", { day: data.battlePass.level });
    }
    return count === 1
      ? t("battlePass.hub.bubbleClaimableOne")
      : t("battlePass.hub.bubbleClaimable", { count });
  }, [data, count, t]);

  // Pantallas donde estorbaría: el editor de código, el propio pase y
  // la bandeja de mensajes en móvil.
  const hidden =
    !isAuthenticated ||
    !userId ||
    pathname.startsWith("/battle-pass") ||
    pathname.startsWith("/messages");
  if (hidden) return null;

  return (
    <>
      {/* Lanzador + burbuja */}
      <div className="pointer-events-none fixed bottom-4 left-4 z-[9000] flex items-end gap-2 sm:bottom-6 sm:left-6">
        <motion.button
          type="button"
          onClick={() => (open ? setOpen(false) : openHub())}
          aria-label={t("battlePass.hub.launcher")}
          aria-expanded={open}
          aria-haspopup="dialog"
          whileTap={{ scale: 0.94 }}
          className="pointer-events-auto relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--card))] text-[rgb(var(--primary))] shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-[rgb(var(--primary))] sm:h-14 sm:w-14"
        >
          <Gift size={22} />
          {count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[rgb(var(--error))] px-1 text-[11px] font-black text-white ring-2 ring-[rgb(var(--card))]">
              {count > 9 ? "9+" : count}
            </span>
          )}
          {count > 0 && !reduceMotion && (
            <span className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-[rgb(var(--primary)/0.25)]" />
          )}
        </motion.button>

        <AnimatePresence>
          {bubble && !open && data && (
            <motion.div
              role="status"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -12, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="pointer-events-auto relative mb-1 flex max-w-[min(18rem,calc(100vw-6rem))] items-center gap-2 rounded-2xl border border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--card))] py-2 pl-3 pr-2 shadow-[0_12px_36px_rgba(0,0,0,0.35)]"
            >
              <span className="absolute -left-1.5 bottom-4 h-3 w-3 rotate-45 border-b border-l border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--card))]" />
              <button
                type="button"
                onClick={() => openHub()}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block text-[0.65rem] font-black uppercase tracking-wide text-[rgb(var(--primary))]">
                  {data.battlePass?.seasonName ?? t("battlePass.hub.title")}
                </span>
                <span className="block text-sm font-bold leading-snug text-[rgb(var(--text))]">
                  {bubbleText}
                </span>
              </button>
              <button
                type="button"
                onClick={() => openHub()}
                className="shrink-0 rounded-xl bg-[rgb(var(--button))] px-3 py-1.5 text-xs font-black uppercase text-[rgb(var(--button-text))] transition hover:brightness-110"
              >
                {t("battlePass.hub.open")}
              </button>
              <button
                type="button"
                onClick={dismissBubble}
                aria-label={t("battlePass.hub.dismiss")}
                className="shrink-0 rounded-lg p-1 text-[rgb(var(--secondary-text))] hover:bg-[rgb(var(--border)/0.5)]"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="hub-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[9001] bg-black/40 sm:bg-black/10"
            />
            <motion.section
              key="hub-panel"
              role="dialog"
              aria-modal="true"
              aria-label={t("battlePass.hub.title")}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-x-0 bottom-0 z-[9002] flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_-20px_60px_rgba(0,0,0,0.45)] sm:inset-x-auto sm:bottom-24 sm:left-6 sm:max-h-[min(640px,calc(100dvh-8rem))] sm:w-[400px] sm:rounded-3xl sm:shadow-[0_24px_70px_rgba(0,0,0,0.5)]"
            >
              {/* Tirador (móvil) */}
              <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-[rgb(var(--border))] sm:hidden" />

              <header className="flex items-center gap-3 px-5 pb-3 pt-3 sm:pt-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]">
                  <Gift size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-black text-[rgb(var(--text))]">
                    {t("battlePass.hub.title")}
                  </h2>
                  {data?.battlePass && (
                    <p className="truncate text-xs text-[rgb(var(--secondary-text))]">
                      {data.battlePass.seasonName}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("battlePass.hub.close")}
                  className="rounded-xl p-2 text-[rgb(var(--secondary-text))] hover:bg-[rgb(var(--border)/0.5)] hover:text-[rgb(var(--text))]"
                >
                  <X size={18} />
                </button>
              </header>

              <nav className="mx-5 grid grid-cols-3 gap-1 rounded-2xl bg-[rgb(var(--background))] p-1" role="tablist">
                <TabButton active={tab === "pass"} onClick={() => setTab("pass")} icon={<Ticket size={15} />} label={t("battlePass.hub.tabPass")} badge={data?.battlePass?.claimable.length ?? 0} />
                <TabButton active={tab === "streak"} onClick={() => setTab("streak")} icon={<Flame size={15} />} label={t("battlePass.hub.tabStreak")} badge={data?.streak.milestones.filter((m) => m.status === "CLAIMABLE").length ?? 0} />
                <TabButton active={tab === "more"} onClick={() => setTab("more")} icon={<LayoutGrid size={15} />} label={t("battlePass.hub.tabMore")} badge={0} />
              </nav>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
                {error && !data ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-[rgb(var(--secondary-text))]">{t("battlePass.hub.loadError")}</p>
                    <button
                      type="button"
                      onClick={() => void load()}
                      className="mt-3 rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm font-bold"
                    >
                      {t("battlePass.retry")}
                    </button>
                  </div>
                ) : !data ? (
                  <div className="space-y-3">
                    <div className="h-20 animate-pulse rounded-2xl bg-[rgb(var(--border)/0.5)]" />
                    <div className="h-14 animate-pulse rounded-2xl bg-[rgb(var(--border)/0.4)]" />
                  </div>
                ) : tab === "pass" ? (
                  <PassTab data={data} busy={busy} onClaim={claimTier} onClaimAll={claimAll} onNavigate={() => setOpen(false)} />
                ) : tab === "streak" ? (
                  <StreakTab data={data} busy={busy} onClaim={claimMilestone} />
                ) : (
                  <MoreTab onNavigate={() => setOpen(false)} />
                )}
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-black uppercase tracking-wide transition ${
        active
          ? "bg-[rgb(var(--card))] text-[rgb(var(--text))] shadow"
          : "text-[rgb(var(--secondary-text))] hover:text-[rgb(var(--text))]"
      }`}
    >
      {icon}
      {label}
      {badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[rgb(var(--error))] px-1 text-[10px] text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

const TIER_ICON: Record<string, React.ReactNode> = {
  COINS: <Coins size={18} />,
  XP: <Zap size={18} />,
  BADGE: <Award size={18} />,
  TITLE: <Crown size={18} />,
};

function TierIcon({ tier, size = 40 }: { tier: BattlePassTier; size?: number }) {
  if (tier.badgeIcon) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-xl bg-purple-500/15"
        style={{ width: size, height: size }}
      >
        <BadgeLogo icon={tier.badgeIcon} height={size - 12} />
      </span>
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]"
      style={{ width: size, height: size }}
    >
      {TIER_ICON[tier.rewardType] ?? <Gift size={18} />}
    </span>
  );
}

function PassTab({
  data,
  busy,
  onClaim,
  onClaimAll,
  onNavigate,
}: {
  data: HubPayload;
  busy: string | null;
  onClaim: (tier: BattlePassTier) => void;
  onClaimAll: () => void;
  onNavigate: () => void;
}) {
  const t = useTranslation();
  const pass = data.battlePass;
  if (!pass) {
    return (
      <p className="py-8 text-center text-sm text-[rgb(var(--secondary-text))]">
        {t("battlePass.hub.noSeason")}
      </p>
    );
  }
  const daily = pass.mode === "DAILY";
  const percent = Math.round((pass.level / Math.max(pass.totalLevels, 1)) * 100);
  const nextFree = pass.next.filter((tier) => tier.track === "FREE" || pass.hasPremium);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4">
        <div className="flex items-center justify-between text-sm font-black text-[rgb(var(--text))]">
          <span>
            {t(daily ? "battlePass.day" : "battlePass.level")} {pass.level} / {pass.totalLevels}
          </span>
          <span className="text-xs font-semibold text-[rgb(var(--secondary-text))]">{percent}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[rgb(var(--border))]">
          <div
            className="h-full rounded-full bg-[rgb(var(--button))] transition-all duration-500"
            style={{ width: `${Math.max(percent, 4)}%` }}
          />
        </div>
      </div>

      {pass.claimable.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-[rgb(var(--secondary-text))]">
              {t("battlePass.hub.readyToClaim")}
            </p>
            {pass.claimable.length > 1 && (
              <button
                type="button"
                onClick={onClaimAll}
                disabled={busy !== null}
                className="rounded-full bg-[rgb(var(--button))] px-3 py-1 text-xs font-black text-[rgb(var(--button-text))] disabled:opacity-60"
              >
                {busy === "all" ? t("battlePass.claiming") : t("battlePass.hub.claimAll")}
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {pass.claimable.map((tier) => (
              <li
                key={tier.id}
                className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.06)] p-3"
              >
                <TierIcon tier={tier} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[rgb(var(--text))]">{rewardLabel(t, tier)}</p>
                  <p className="text-[11px] text-[rgb(var(--secondary-text))]">
                    {t(daily ? "battlePass.day" : "battlePass.levelShort")} {tier.level} ·{" "}
                    {tier.track === "PREMIUM" ? t("battlePass.premiumTrack") : t("battlePass.freeTrack")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onClaim(tier)}
                  disabled={busy !== null}
                  className="shrink-0 rounded-xl bg-[rgb(var(--button))] px-3 py-2 text-xs font-black uppercase text-[rgb(var(--button-text))] transition hover:brightness-110 disabled:opacity-60"
                >
                  {busy === tier.id ? t("battlePass.claiming") : t("battlePass.claim")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-4 text-center text-sm text-[rgb(var(--secondary-text))]">
          {t("battlePass.hub.nothingToClaim")}
        </p>
      )}

      {!pass.isMaxLevel && nextFree.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-[rgb(var(--secondary-text))]">
            {daily ? t("battlePass.hub.tomorrow") : t("battlePass.hub.nextLevel")}
          </p>
          <ul className="space-y-2">
            {nextFree.map((tier) => (
              <li
                key={tier.id}
                className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] p-3 opacity-80"
              >
                <TierIcon tier={tier} size={36} />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[rgb(var(--text))]">
                  {rewardLabel(t, tier)}
                </p>
                <Lock size={14} className="shrink-0 text-[rgb(var(--secondary-text))]" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {pass.lockedPremium > 0 && (
        <Link
          href="/premium"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--primary)/0.35)] bg-[rgb(var(--primary)/0.06)] p-3 text-sm font-bold text-[rgb(var(--text))] transition hover:bg-[rgb(var(--primary)/0.12)]"
        >
          <Crown size={18} className="shrink-0 text-[rgb(var(--primary))]" />
          <span className="min-w-0 flex-1">{t("battlePass.hub.premiumWaiting", { count: pass.lockedPremium })}</span>
          <ChevronRight size={16} />
        </Link>
      )}

      <Link
        href="/battle-pass"
        onClick={onNavigate}
        className="flex items-center justify-center gap-2 rounded-2xl border border-[rgb(var(--border))] py-3 text-sm font-black text-[rgb(var(--text))] transition hover:border-[rgb(var(--primary)/0.6)]"
      >
        <Ticket size={16} />
        {t("battlePass.hub.viewFullPass")}
      </Link>
    </div>
  );
}

function StreakTab({
  data,
  busy,
  onClaim,
}: {
  data: HubPayload;
  busy: string | null;
  onClaim: (milestone: StreakMilestone) => void;
}) {
  const t = useTranslation();
  const { current, best, milestones } = data.streak;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl border border-[rgb(var(--cb-warning)/0.5)] bg-[rgb(var(--cb-warning)/0.08)] p-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--cb-warning)/0.18)] text-[rgb(var(--cb-warning))]">
          <Flame size={30} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--secondary-text))]">
            {t("battlePass.hub.streakCurrent")}
          </p>
          <p className="text-2xl font-black text-[rgb(var(--text))]">
            {t("battlePass.hub.streakDays", { count: current })}
          </p>
          <p className="text-xs text-[rgb(var(--secondary-text))]">
            {t("battlePass.hub.streakBest", { count: best })}
          </p>
        </div>
      </div>
      <p className="text-xs text-[rgb(var(--secondary-text))]">{t("battlePass.hub.streakHint")}</p>

      {milestones.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-4 text-center text-sm text-[rgb(var(--secondary-text))]">
          {t("battlePass.hub.noStreakRewards")}
        </p>
      ) : (
        <ol className="relative space-y-2 before:absolute before:bottom-4 before:left-[27px] before:top-4 before:w-0.5 before:bg-[rgb(var(--border))]">
          {milestones.map((milestone) => {
            const reached = milestone.status !== "LOCKED";
            const remaining = Math.max(milestone.requiredValue - current, 0);
            return (
              <li
                key={milestone.id}
                className={`relative flex items-center gap-3 rounded-2xl border p-3 ${
                  milestone.status === "CLAIMABLE"
                    ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.06)]"
                    : "border-[rgb(var(--border))] bg-[rgb(var(--card))]"
                }`}
              >
                <span
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    milestone.status === "CLAIMED"
                      ? "bg-[rgb(var(--success))] text-white"
                      : reached
                        ? "bg-[rgb(var(--primary))] text-[rgb(var(--button-text))]"
                        : "bg-[rgb(var(--border))] text-[rgb(var(--secondary-text))]"
                  }`}
                >
                  {milestone.status === "CLAIMED" ? <Check size={15} /> : milestone.requiredValue}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[rgb(var(--text))]">
                    {t("battlePass.hub.streakMilestone", { days: milestone.requiredValue })}
                  </p>
                  <p className="truncate text-[11px] text-[rgb(var(--secondary-text))]">
                    {milestone.rewards
                      .map((reward) =>
                        rewardLabel(t, {
                          rewardType: String(reward.type).toUpperCase() as BattlePassTier["rewardType"],
                          amount: reward.amount ?? null,
                          badgeIcon: null,
                          label: reward.label ?? milestone.name,
                        }),
                      )
                      .join(" · ")}
                  </p>
                </div>
                {milestone.status === "CLAIMABLE" ? (
                  <button
                    type="button"
                    onClick={() => onClaim(milestone)}
                    disabled={busy !== null}
                    className="shrink-0 rounded-xl bg-[rgb(var(--button))] px-3 py-2 text-xs font-black uppercase text-[rgb(var(--button-text))] disabled:opacity-60"
                  >
                    {busy === milestone.id ? t("battlePass.claiming") : t("battlePass.claim")}
                  </button>
                ) : milestone.status === "CLAIMED" ? (
                  <span className="shrink-0 text-[10px] font-black uppercase text-[rgb(var(--success-text))]">
                    {t("battlePass.hub.claimedLabel")}
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] font-semibold text-[rgb(var(--secondary-text))]">
                    {t("battlePass.hub.streakRemaining", { count: remaining })}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function MoreTab({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslation();
  const tiles = [
    { href: "/battle-pass", icon: <Ticket size={22} />, label: t("navbar.battlePass") },
    { href: "/missions", icon: <Target size={22} />, label: t("navbar.missions") },
    { href: "/achievements", icon: <Trophy size={22} />, label: t("navbar.achievements") },
    { href: "/badges", icon: <Award size={22} />, label: t("navbar.badges") },
    { href: "/rewards", icon: <Gift size={22} />, label: t("navbar.rewardCenter") },
    { href: "/referrals", icon: <Users size={22} />, label: t("navbar.referrals") },
  ];
  return (
    <div>
      <p className="mb-3 text-xs text-[rgb(var(--secondary-text))]">{t("battlePass.hub.moreHint")}</p>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            onClick={onNavigate}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-2 text-center text-[11px] font-black uppercase leading-tight text-[rgb(var(--text))] transition hover:-translate-y-0.5 hover:border-[rgb(var(--primary)/0.6)]"
          >
            <span className="text-[rgb(var(--primary))]">{tile.icon}</span>
            {tile.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
