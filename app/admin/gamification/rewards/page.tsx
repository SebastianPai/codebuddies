"use client";

import { useEffect, useState } from "react";
import { Gift, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../../utils/api";
import RewardBuilder from "../components/RewardBuilder";
import { Field, Textarea, Toggle } from "../components/AdminFields";
import RewardChips from "../../../../components/gamification/RewardChips";
import type { AdminReward, RewardBundle } from "../components/admin-gamification-types";
import { useTranslation } from "../../../../src/i18n/useTranslation";

type RewardHistory = {
  id: string;
  label: string;
  rewardType: string;
  sourceType: string;
  grantedAt: string;
  user?: { username: string; email: string };
};

export default function AdminRewardsPage() {
  const t = useTranslation();
  const [bundles, setBundles] = useState<RewardBundle[]>([]);
  const [history, setHistory] = useState<RewardHistory[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [rewards, setRewards] = useState<AdminReward[]>([]);

  const load = async () => {
    const [bundleData, historyData] = await Promise.all([
      api.get<RewardBundle[]>("/admin/gamification/reward-bundles"),
      api.get<RewardHistory[]>("/admin/gamification/reward-history"),
    ]);
    setBundles(bundleData);
    setHistory(historyData);
  };

  useEffect(() => {
    void load();
  }, []);

  const createBundle = async () => {
    if (!name || !rewards.length) {
      toast.error(t("gamification.addNameAndReward"));
      return;
    }
    await api.post("/admin/gamification/reward-bundles", {
      name,
      description,
      active,
      rewards,
    });
    setName("");
    setDescription("");
    setRewards([]);
    toast.success(t("gamification.packCreated"));
    await load();
  };

  const removeBundle = async (id: string) => {
    if (!window.confirm(t("gamification.confirmDeletePack"))) return;
    await api.delete(`/admin/gamification/reward-bundles/${id}`);
    toast.success(t("gamification.packDeleted"));
    await load();
  };

  return (
    <div className="grid gap-6 p-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-md border border-zinc-800 bg-[#111111] p-5">
        <h1 className="text-3xl font-black">{t("gamification.rewardCatalog")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t("gamification.rewardCatalogDescription")}</p>
        <div className="mt-5 space-y-4">
          <Field label={t("gamification.packName")} value={name} onChange={setName} />
          <Textarea label={t("items.description")} value={description} onChange={setDescription} />
          <Toggle label={t("gamification.activeMale")} checked={active} onChange={setActive} />
          <RewardBuilder value={rewards} onChange={setRewards} />
          <button type="button" onClick={() => void createBundle()} className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-3 font-bold text-black">
            <Gift size={16} />
            {t("gamification.savePack")}
          </button>
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-md border border-zinc-800 bg-[#111111] p-5">
          <h2 className="text-xl font-black">{t("gamification.availablePacks")}</h2>
          <div className="mt-4 space-y-3">
            {bundles.map((bundle) => (
              <div key={bundle.id} className="rounded-md border border-zinc-800 bg-black p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black">{bundle.name}</p>
                    {bundle.description ? <p className="mt-1 text-sm text-zinc-500">{bundle.description}</p> : null}
                  </div>
                  <button type="button" onClick={() => void removeBundle(bundle.id)} className="text-red-300" aria-label={t("gamification.deleteNamed", { name: bundle.name })}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-3">
                  <RewardChips rewards={bundle.rewards} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-zinc-800 bg-[#111111] p-5">
          <h2 className="text-xl font-black">{t("gamification.rewardHistory")}</h2>
          <div className="mt-4 space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="grid gap-2 rounded-md border border-zinc-800 bg-black p-3 md:grid-cols-[1fr_140px_170px]">
                <div>
                  <p className="font-bold">{entry.label}</p>
                  <p className="text-sm text-zinc-500">{entry.user?.username ?? entry.user?.email ?? t("gamification.user")}</p>
                </div>
                <span className="text-sm text-yellow-400">{entry.sourceType}</span>
                <time className="text-sm text-zinc-500">{new Date(entry.grantedAt).toLocaleString("es-CO")}</time>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
