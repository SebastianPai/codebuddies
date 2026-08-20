"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Award, Check, Coins, Crown, Gift, Lock, Zap } from "lucide-react";
import { useTranslation } from "../../src/i18n/useTranslation";
import type { BattlePassTier } from "./battle-pass-types";

const REWARD_ICON: Record<string, React.ReactNode> = {
  COINS: <Coins size={18} />,
  XP: <Zap size={18} />,
  BADGE: <Award size={18} />,
  TITLE: <Crown size={18} />,
};

function rewardLabel(t: ReturnType<typeof useTranslation>, tier: BattlePassTier): string {
  switch (tier.rewardType) {
    case "COINS":
      return t("battlePass.rewardCoins", { amount: tier.amount ?? 0 });
    case "XP":
      return t("battlePass.rewardXp", { amount: tier.amount ?? 0 });
    case "BADGE":
      return t("battlePass.rewardBadge");
    case "TITLE":
      return t("battlePass.rewardTitle");
    default:
      return tier.label || t("battlePass.rewardCustom");
  }
}

export function BattlePassTicket({
  tier,
  claiming,
  onClaim,
}: {
  tier: BattlePassTier;
  claiming: boolean;
  onClaim: (tierId: string) => void;
}) {
  const t = useTranslation();
  const reduceMotion = useReducedMotion();
  const locked = !tier.levelReached || !tier.trackUnlocked;
  const icon = REWARD_ICON[tier.rewardType] ?? <Gift size={18} />;

  const stateClasses = tier.claimed
    ? "border-[rgb(var(--success))] bg-[rgb(var(--success)/0.08)]"
    : tier.claimable
      ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.08)]"
      : "border-[rgb(var(--border))] bg-[rgb(var(--card))]";

  return (
    <motion.div
      initial={false}
      animate={tier.claimed && !reduceMotion ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
      className={`relative flex w-32 shrink-0 flex-col items-center gap-2 rounded-2xl border p-3 pt-4 text-center sm:w-36 ${stateClasses} ${
        locked && !tier.claimed ? "opacity-60" : ""
      }`}
    >
      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-2 py-0.5 text-[10px] font-black text-[rgb(var(--text))]">
        {t("battlePass.levelShort")} {tier.level}
      </span>

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          tier.claimed
            ? "bg-[rgb(var(--success))] text-white"
            : "bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]"
        }`}
      >
        {locked && !tier.claimed ? <Lock size={16} /> : tier.claimed ? <Check size={18} /> : icon}
      </div>

      <p className="min-h-8 text-xs font-semibold text-[rgb(var(--text))]">{rewardLabel(t, tier)}</p>

      {tier.claimable ? (
        <button
          type="button"
          onClick={() => onClaim(tier.id)}
          disabled={claiming}
          className="w-full rounded-full bg-[rgb(var(--primary))] px-2 py-1.5 text-xs font-bold text-[rgb(var(--button-text))] transition-transform hover:scale-[1.03] disabled:opacity-60"
        >
          {claiming ? t("battlePass.claiming") : t("battlePass.claim")}
        </button>
      ) : tier.claimed ? (
        <span className="text-[10px] font-bold uppercase text-[rgb(var(--success-text))]">
          {t("battlePass.claimed")}
        </span>
      ) : !tier.trackUnlocked ? (
        <span className="text-[10px] text-[rgb(var(--secondary-text))]">{t("battlePass.lockedPremium")}</span>
      ) : (
        <span className="text-[10px] text-[rgb(var(--secondary-text))]">
          {t("battlePass.lockedLevel", { level: tier.level })}
        </span>
      )}
    </motion.div>
  );
}
