"use client";
import { useTranslation } from "../../src/i18n/useTranslation";

export default function GamificationProgress({
  current,
  target,
  label,
}: {
  current: number;
  target: number;
  label?: string;
}) {
  const t = useTranslation();
  const safeTarget = Math.max(target, 1);
  const percentage = Math.min(Math.round((current / safeTarget) * 100), 100);

  return (
    <div>
      <div className="flex items-center justify-between text-sm text-[rgb(var(--secondary-text))]">
        <span>{label ?? `${current} / ${safeTarget}`}</span>
        <span>{percentage}%</span>
      </div>
      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-[rgb(var(--border))]"
        aria-label={t("gamification.progressLabel", { current, target: safeTarget })}
      >
        <div
          className="h-full rounded-full bg-[rgb(var(--button))] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
