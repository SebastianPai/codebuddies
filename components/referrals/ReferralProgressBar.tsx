"use client";
import { useTranslation } from "../../src/i18n/useTranslation";

export default function ReferralProgressBar({
  current,
  target,
  title,
  subtitle,
}: {
  current: number;
  target: number;
  title: string;
  subtitle: string;
}) {
  const t = useTranslation();
  const safeTarget = Math.max(target, 1);
  const clamped = Math.min(current, safeTarget);
  const width = Math.max((clamped / safeTarget) * 100, current > 0 ? 6 : 0);

  return (
    <div className="rounded-3xl border border-white/10 bg-black p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-white/50">{title}</p>
          <p className="mt-1 text-3xl font-black">
            {current} / {safeTarget}
          </p>
        </div>
        <p className="text-sm text-white/55">{subtitle}</p>
      </div>
      <div
        className="mt-4 h-4 overflow-hidden rounded-full bg-white/10"
        aria-label={t("referrals.progressLabel", { current, target: safeTarget })}
      >
        <div
          className="h-full rounded-full bg-[#d5ff3f] transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
