"use client";

import { Award, BadgeCheck, Coins, Gift, PawPrint, Shield, Sofa, Sparkles, Star, Zap } from "lucide-react";
import type { RewardConfig } from "./gamification-types";
import { useTranslation } from "../../src/i18n/useTranslation";

const iconByType: Record<string, React.ReactNode> = {
  COINS: <Coins size={14} />,
  XP: <Zap size={14} />,
  ITEM: <Gift size={14} />,
  AVATAR_ITEM: <Sparkles size={14} />,
  FURNITURE: <Sofa size={14} />,
  PET: <PawPrint size={14} />,
  BADGE: <BadgeCheck size={14} />,
  TITLE: <Award size={14} />,
  ROLE: <Shield size={14} />,
  CUSTOM: <Star size={14} />,
};

export default function RewardChips({ rewards }: { rewards: RewardConfig[] }) {
  const t = useTranslation();
  if (!rewards.length) {
    return <span className="text-sm text-[rgb(var(--secondary-text))]">{t("gamification.noRewards")}</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {rewards.map((reward, index) => {
        const type = String(reward.type).toUpperCase();
        return (
          <span
            key={`${type}-${index}`}
            className="inline-flex items-center gap-1 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-2.5 py-1 text-xs font-bold text-[rgb(var(--text))]"
          >
            <span className="text-[rgb(var(--primary))]">{iconByType[type] ?? iconByType.CUSTOM}</span>
            {reward.label ?? `${reward.amount ? `${reward.amount} ` : ""}${type}`}
          </span>
        );
      })}
    </div>
  );
}
