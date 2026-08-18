"use client";

import { motion } from "framer-motion";
import { Award, Coins, Flame, Sparkles, Target, Zap } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { Skeleton } from "@/shared/ui";
import { classNames } from "@/shared/utils/class-names";
import { useWorldPulse } from "./use-world-pulse";

function PulseDot({ tone }: { tone: "light" | "dark" }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
        animate={{ scale: [1, 1.9, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span
        className={classNames(
          "relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400",
          tone === "light" ? "ring-2 ring-white/20" : "ring-2 ring-black/10",
        )}
      />
    </span>
  );
}

interface StatChipProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: "light" | "dark";
}

function StatChip({ icon, value, label, tone }: StatChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={classNames(
        "flex items-center gap-3 rounded-2xl border px-4 py-3",
        tone === "light"
          ? "border-white/10 bg-white/5"
          : "border-[rgb(var(--border))] bg-[rgb(var(--background))]",
      )}
    >
      <span className="text-[rgb(var(--primary))]">{icon}</span>
      <div className="min-w-0">
        <p className={classNames("text-lg font-black leading-none", tone === "light" ? "text-white" : "text-[rgb(var(--text))]")}>
          {value.toLocaleString()}
        </p>
        <p className={classNames("mt-1 truncate text-xs uppercase tracking-wide", tone === "light" ? "text-white/50" : "text-[rgb(var(--secondary-text))]")}>
          {label}
        </p>
      </div>
    </motion.div>
  );
}

interface WorldPulseBarProps {
  variant?: "landing" | "compact";
  className?: string;
}

// Sección 10/11 del pedido de producto: actividad real de la plataforma,
// no inventada. Cada número viene de GET /rankings/world-pulse
// (apps/api), que agrega Completion/UserMissionProgress/Certificate/
// XPTransaction/CoinTransaction de HOY más la presencia SSE en vivo — no
// hay ningún valor hardcodeado ni mínimo artificial acá. Si la plataforma
// todavía tiene poca actividad, este componente lo muestra tal cual.
export function WorldPulseBar({ variant = "landing", className }: WorldPulseBarProps) {
  const t = useTranslation();
  const { pulse, isLoading } = useWorldPulse();
  const tone: "light" | "dark" = variant === "landing" ? "light" : "dark";

  if (isLoading) {
    return (
      <div className={classNames("flex flex-wrap gap-3", className)}>
        <Skeleton className="h-16 w-40 rounded-2xl" />
        <Skeleton className="h-16 w-40 rounded-2xl" />
        <Skeleton className="h-16 w-40 rounded-2xl" />
      </div>
    );
  }

  if (!pulse) return null;

  return (
    <div className={className}>
      <div className="mb-4 flex items-center gap-2">
        <PulseDot tone={tone} />
        <p
          className={classNames(
            "font-mono text-sm uppercase tracking-wide",
            tone === "light" ? "text-white/70" : "text-[rgb(var(--secondary-text))]",
          )}
        >
          {t("site.worldPulseTitle")}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <StatChip
          tone={tone}
          icon={<Sparkles size={18} />}
          value={pulse.onlineNow}
          label={t("site.worldPulseOnlineNow", { count: pulse.onlineNow })}
        />
        <StatChip
          tone={tone}
          icon={<Target size={18} />}
          value={pulse.today.exercisesCompleted}
          label={t("site.worldPulseExercisesToday", { count: pulse.today.exercisesCompleted })}
        />
        <StatChip
          tone={tone}
          icon={<Flame size={18} />}
          value={pulse.today.missionsCompleted}
          label={t("site.worldPulseMissionsToday", { count: pulse.today.missionsCompleted })}
        />
        <StatChip
          tone={tone}
          icon={<Award size={18} />}
          value={pulse.today.certificatesEarned}
          label={t("site.worldPulseCertificatesToday", { count: pulse.today.certificatesEarned })}
        />
        <StatChip
          tone={tone}
          icon={<Zap size={18} />}
          value={pulse.today.xpEarned}
          label={t("site.worldPulseXpToday", { count: pulse.today.xpEarned })}
        />
        <StatChip
          tone={tone}
          icon={<Coins size={18} />}
          value={pulse.today.coinsEarned}
          label={t("site.worldPulseCoinsToday", { count: pulse.today.coinsEarned })}
        />
      </div>
    </div>
  );
}
