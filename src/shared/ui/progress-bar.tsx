import { useTranslation } from "@/i18n/useTranslation";

interface ProgressBarProps {
  current: number;
  target: number;
  title?: string;
  subtitle?: string;
}

export function ProgressBar({ current, target, title, subtitle }: ProgressBarProps) {
  const t = useTranslation();
  const safeTarget = Math.max(target, 1);
  const clamped = Math.min(current, safeTarget);
  const width = Math.max((clamped / safeTarget) * 100, current > 0 ? 6 : 0);
  return <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div>{title && <p className="text-sm text-[rgb(var(--secondary-text))]">{title}</p>}<p className="mt-1 text-3xl font-black text-[rgb(var(--text))]">{current} / {safeTarget}</p></div>{subtitle && <p className="text-sm text-[rgb(var(--secondary-text))]">{subtitle}</p>}</div><div className="mt-4 h-4 overflow-hidden rounded-full bg-[rgb(var(--border))]" aria-label={t("common.pageOf", { page: current, total: safeTarget })}><div className="h-full rounded-full bg-[rgb(var(--button))] transition-all duration-500" style={{ width: `${width}%` }} /></div></div>;
}
