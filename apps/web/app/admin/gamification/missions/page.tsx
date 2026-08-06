"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../../utils/api";
import { findCondition } from "../components/condition-catalog";
import type { AdminMission } from "../components/admin-gamification-types";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function AdminMissionsPage() {
  const t = useTranslation();
  const [missions, setMissions] = useState<AdminMission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setMissions(await api.get<AdminMission[]>("/admin/gamification/missions"));
    } catch {
      toast.error(t("gamification.missionsLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm(t("gamification.confirmDeleteMission"))) return;
    await api.delete(`/admin/gamification/missions/${id}`);
    toast.success(t("gamification.missionDeleted"));
    await load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{t("gamification.missions")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("gamification.missionsDescription")}</p>
        </div>
        <Link href="/admin/gamification/missions/new" className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-3 font-bold text-black">
          <Plus size={16} />
          {t("common.create")}
        </Link>
      </div>

      {loading ? <div className="mt-8 text-zinc-500">{t("common.loading")}</div> : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        {missions.map((mission) => {
          const condition = findCondition(mission.condition);
          return (
            <div key={mission.id} className="grid gap-3 border-t border-zinc-800 bg-[#111111] p-4 first:border-t-0 lg:grid-cols-[1fr_180px_140px_110px] lg:items-center">
              <div>
                <p className="font-black">{mission.name}</p>
                <p className="mt-1 text-sm text-zinc-500">{t(condition.labelKey)} · {mission.cadence}</p>
              </div>
              <span className="text-sm text-zinc-400">{mission.visibility === "VISIBLE" ? t("gamification.visible") : t("gamification.hidden")}</span>
              <span className="text-sm text-zinc-400">{t("gamification.usersCount", { count: mission._count?.progress ?? 0 })}</span>
              <div className="flex gap-2 lg:justify-end">
                <Link href={`/admin/gamification/missions/${mission.id}`} className="rounded-md border border-zinc-800 p-2 text-yellow-400" aria-label={t("gamification.editNamed", { name: mission.name })}>
                  <Edit size={16} />
                </Link>
                <button type="button" onClick={() => void remove(mission.id)} className="rounded-md border border-zinc-800 p-2 text-red-300" aria-label={t("gamification.deleteNamed", { name: mission.name })}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
