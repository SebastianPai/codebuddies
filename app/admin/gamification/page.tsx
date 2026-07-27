"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, BadgeCheck, Calendar, Gift, PawPrint, RefreshCcw, Target, Trophy } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

type Dashboard = Record<string, number>;

export default function AdminGamificationDashboardPage() {
  const t = useTranslation();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setDashboard(await api.get<Dashboard>("/admin/gamification/dashboard"));
    } catch {
      toast.error(t("gamification.dashboardLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const metrics = useMemo(
    () => [
      [t("gamification.activeMissions"), dashboard?.activeMissions ?? 0, <Target key="m" size={18} />],
      [t("gamification.completedMissions"), dashboard?.completedMissions ?? 0, <Award key="c" size={18} />],
      [t("gamification.claimedMissions"), dashboard?.claimedMissions ?? 0, <Gift key="r" size={18} />],
      [t("gamification.unlockedAchievements"), dashboard?.achievementsUnlocked ?? 0, <Trophy key="a" size={18} />],
      [t("gamification.usersWithProgress"), dashboard?.usersWithProgress ?? 0, <BadgeCheck key="u" size={18} />],
      [t("navbar.referrals"), dashboard?.referrals ?? 0, <Target key="ref" size={18} />],
      [t("gamification.conversion"), `${dashboard?.conversion ?? 0}%`, <Calendar key="v" size={18} />],
      [t("gamification.deliveredRewards"), dashboard?.rewardsDelivered ?? 0, <Gift key="g" size={18} />],
      [t("gamification.deliveredCoins"), dashboard?.coinsDelivered ?? 0, <Gift key="coins" size={18} />],
      [t("gamification.deliveredXp"), dashboard?.xpDelivered ?? 0, <Award key="xp" size={18} />],
      [t("gamification.deliveredItems"), dashboard?.itemsDelivered ?? 0, <Gift key="items" size={18} />],
      [t("gamification.deliveredPets"), dashboard?.petsDelivered ?? 0, <PawPrint key="p" size={18} />],
    ],
    [dashboard, t],
  );

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-black">{t("gamification.title")}</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {t("gamification.dashboardDescription")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-4 py-3 font-bold"
        >
          <RefreshCcw size={16} />
          {t("common.refresh")}
        </button>
      </div>

      {loading ? <div className="mt-8 text-zinc-500">{t("common.loading")}</div> : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, icon]) => (
          <div key={String(label)} className="rounded-lg border border-zinc-800 bg-[#111111] p-4">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-black uppercase">{label}</span>
              <span className="text-yellow-400">{icon}</span>
            </div>
            <p className="mt-3 text-3xl font-black">{value}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
