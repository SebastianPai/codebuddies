"use client";

import { CheckCircle2, Eye, Gift, Lock, Target } from "lucide-react";
import { motion } from "framer-motion";
import GamificationProgress from "./GamificationProgress";
import RewardChips from "./RewardChips";
import type { MissionItem } from "./gamification-types";
import { useTranslation } from "../../src/i18n/useTranslation";
import { Badge, Button } from "../../src/shared/ui";

const statusBadgeVariant: Record<string, "default" | "primary" | "warning" | "success"> = {
  PENDING: "default",
  IN_PROGRESS: "primary",
  COMPLETED: "warning",
  CLAIMED: "success",
};

export default function MissionCard({
  mission,
  onClaim,
  claiming,
}: {
  mission: MissionItem;
  onClaim: (id: string) => void;
  claiming?: boolean;
}) {
  const t = useTranslation();
  const statusLabels: Record<string, string> = {
    PENDING: t("gamification.pending"),
    IN_PROGRESS: t("gamification.inProgress"),
    COMPLETED: t("gamification.completed"),
    CLAIMED: t("gamification.claimed"),
  };
  const canClaim = mission.progress.status === "COMPLETED";
  const claimIcon =
    mission.progress.status === "CLAIMED" ? (
      <CheckCircle2 size={16} />
    ) : canClaim ? (
      <Gift size={16} />
    ) : (
      <Lock size={16} />
    );

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--button))] text-[rgb(var(--button-text))]">
            {mission.icon ?? <Target size={20} />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black">{mission.name}</h2>
              <Badge variant={statusBadgeVariant[mission.progress.status] ?? "default"}>
                {statusLabels[mission.progress.status] ?? mission.progress.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[rgb(var(--secondary-text))]">{mission.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled
            title={t("gamification.detailsUnavailable")}
            aria-label={`${t("gamification.details")}: ${mission.name}`}
          >
            <Eye size={16} />
            {t("gamification.details")}
          </Button>
          <Button
            variant="primary"
            onClick={() => onClaim(mission.id)}
            disabled={!canClaim}
            isLoading={claiming}
            aria-label={`${t("gamification.claim")}: ${mission.name}`}
          >
            {claimIcon}
            {t("gamification.claim")}
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <GamificationProgress
          current={mission.progress.currentValue}
          target={mission.progress.targetValue}
          label={`${mission.progress.currentValue} / ${mission.progress.targetValue}`}
        />
      </div>

      <div className="mt-4">
        <RewardChips rewards={mission.rewards} />
      </div>
    </motion.article>
  );
}
