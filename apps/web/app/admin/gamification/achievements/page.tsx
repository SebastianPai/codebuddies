"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../../utils/api";
import { findCondition } from "../components/condition-catalog";
import type { AdminAchievement } from "../components/admin-gamification-types";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import { useConfirm } from "@/shared/ui";

export default function AdminAchievementsPage() {
  const t = useTranslation();
  const { confirm, ConfirmDialog } = useConfirm();
  const [items, setItems] = useState<AdminAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await api.get<AdminAchievement[]>("/admin/gamification/achievements"));
    } catch {
      toast.error(t("gamification.achievementsLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = async (id: string) => {
    if (!(await confirm(t("gamification.confirmDeleteAchievement")))) return;
    await api.delete(`/admin/gamification/achievements/${id}`);
    toast.success(t("gamification.achievementDeleted"));
    await load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{t("gamification.achievements")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("gamification.achievementsDescription")}</p>
        </div>
        <Link href="/admin/gamification/achievements/new" className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-3 font-bold text-black">
          <Plus size={16} />
          {t("common.create")}
        </Link>
      </div>

      {loading ? <div className="mt-8 text-zinc-500">{t("common.loading")}</div> : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        {items.map((item) => {
          const condition = findCondition(item.condition);
          return (
            <div key={item.id} className="grid gap-3 border-t border-zinc-800 bg-[#111111] p-4 first:border-t-0 lg:grid-cols-[1fr_180px_140px_110px] lg:items-center">
              <div>
                <p className="font-black">{item.name}</p>
                <p className="mt-1 text-sm text-zinc-500">{t(condition.labelKey)}</p>
              </div>
              <span className="text-sm text-zinc-400">{item.visible ? t("gamification.visible") : t("gamification.hiddenMale")}</span>
              <span className="text-sm text-zinc-400">{t("gamification.unlocksCount", { count: item._count?.unlockedBy ?? 0 })}</span>
              <div className="flex gap-2 lg:justify-end">
                <Link href={`/admin/gamification/achievements/${item.id}`} className="rounded-md border border-zinc-800 p-2 text-yellow-400" aria-label={t("gamification.editNamed", { name: item.name })}>
                  <Edit size={16} />
                </Link>
                <button type="button" onClick={() => void remove(item.id)} className="rounded-md border border-zinc-800 p-2 text-red-300" aria-label={t("gamification.deleteNamed", { name: item.name })}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {ConfirmDialog}
    </div>
  );
}
