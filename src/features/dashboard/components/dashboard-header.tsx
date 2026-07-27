import { Coins, Flame, Trophy, Zap } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import type { DashboardUser } from "../types/dashboard";

interface DashboardHeaderProps {
  user: DashboardUser;
  xp: number;
  coins: number;
  streak: number;
  rank: number | null;
}

export function DashboardHeader({ user, xp, coins, streak, rank }: DashboardHeaderProps) {
  const t = useTranslation();
  const stats = [
    { icon: <Zap size={18} />, label: "XP", value: xp.toLocaleString() },
    { icon: <Flame size={18} />, label: t("dashboard.streak"), value: String(streak) },
    { icon: <Coins size={18} />, label: "Coins", value: coins.toLocaleString() },
    { icon: <Trophy size={18} />, label: t("dashboard.rank"), value: rank ? `#${rank}` : "-" },
  ];
  return (
    <section className="mb-8">
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 md:p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-5 inline-flex rounded-full bg-[rgb(var(--button))] px-3 py-1 text-xs font-black uppercase text-[rgb(var(--button-text))]">
              {t("dashboard.activeSystem")}
            </div>
            <h1 className="text-4xl font-black leading-none tracking-tight md:text-6xl">
              {t("dashboard.hello")} <span className="text-[rgb(var(--primary))]">{user.username}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[rgb(var(--secondary-text))] md:text-base">
              {t("dashboard.description")}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4 xl:w-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[rgb(var(--primary))]">{stat.icon}</span>
                  <span className="text-xs font-bold uppercase text-[rgb(var(--secondary-text))]">{stat.label}</span>
                </div>
                <h3 className="truncate text-2xl font-black">{stat.value}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
