"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../utils/api";
import { useTranslation } from "../../src/i18n/useTranslation";

type Upgrade = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  priceCoins: number;
  unlockStates: string[];
  requiresId: string | null;
  sortOrder: number;
};

type Payload = {
  hasBehavior: boolean;
  states: string[];
  upgrades: Upgrade[];
};

type Draft = Omit<Upgrade, "id"> & { id?: string };

const EMPTY: Draft = {
  key: "",
  name: "",
  description: "",
  priceCoins: 100,
  unlockStates: [],
  requiresId: null,
  sortOrder: 0,
};

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Mejoras desbloqueables de un objeto del mundo con comportamiento: cada una
// desbloquea estados (ej. la TV se vende apagada y "Encendido" desbloquea
// ON). Lo usan el admin (/admin/items/:id) y el creador dueño del objeto en
// el marketplace; el API valida quién puede editar.
export default function ItemUpgradesEditor({ itemId }: { itemId: string }) {
  const t = useTranslation();
  const [data, setData] = useState<Payload | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const payload = await api.get<Payload>(`/items/${itemId}/upgrades`);
      setData(payload);
      setDrafts(payload.upgrades.map((u) => ({ ...u, description: u.description ?? "" })));
    } catch {
      toast.error(t("items.upgradesLoadError"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) return null;

  const update = (index: number, patch: Partial<Draft>) =>
    setDrafts((list) => list.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const save = async (index: number) => {
    const draft = drafts[index];
    const key = draft.key || slug(draft.name);
    setSaving(draft.id ?? `new-${index}`);
    try {
      const body = {
        name: draft.name,
        description: draft.description || undefined,
        priceCoins: Number(draft.priceCoins),
        unlockStates: draft.unlockStates,
        requiresId: draft.requiresId || null,
        sortOrder: Number(draft.sortOrder) || 0,
      };
      if (draft.id) await api.patch(`/item-upgrades/${draft.id}`, body);
      else await api.post(`/items/${itemId}/upgrades`, { ...body, key });
      toast.success(t("items.upgradeSaved"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("items.upgradeSaveError"));
    } finally {
      setSaving(null);
    }
  };

  const remove = async (index: number) => {
    const draft = drafts[index];
    if (!draft.id) {
      setDrafts((list) => list.filter((_, i) => i !== index));
      return;
    }
    if (!window.confirm(t("items.upgradeDeleteConfirm"))) return;
    try {
      const result = await api.delete<{ deactivated?: boolean }>(`/item-upgrades/${draft.id}`);
      toast.success(result?.deactivated ? t("items.upgradeDeactivated") : t("items.upgradeDeleted"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("items.upgradeSaveError"));
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-[#0c0c0c] p-4 sm:p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-black text-white">
          <Sparkles size={18} className="text-yellow-400" /> {t("items.upgradesTitle")}
        </h2>
        <p className="mt-1 text-xs text-zinc-400">{t("items.upgradesHint")}</p>
      </div>

      {!data.hasBehavior ? (
        <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
          {t("items.upgradesNeedBehavior")}
        </p>
      ) : data.states.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
          {t("items.upgradesNeedStates")}
        </p>
      ) : (
        <>
          {drafts.map((draft, index) => (
            <div key={draft.id ?? `new-${index}`} className="space-y-3 rounded-xl border border-zinc-800 bg-black p-3 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <label className="text-xs text-zinc-400">
                  {t("items.upgradeName")}
                  <input
                    value={draft.name}
                    onChange={(e) => update(index, { name: e.target.value })}
                    placeholder={t("items.upgradeNamePlaceholder")}
                    maxLength={60}
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-zinc-400">
                  {t("items.upgradePrice")}
                  <input
                    type="number"
                    min={1}
                    value={draft.priceCoins}
                    onChange={(e) => update(index, { priceCoins: Math.max(1, Number(e.target.value) || 1) })}
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                </label>
              </div>
              <label className="block text-xs text-zinc-400">
                {t("items.upgradeDescription")}
                <input
                  value={draft.description ?? ""}
                  onChange={(e) => update(index, { description: e.target.value })}
                  maxLength={300}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <div>
                <p className="text-xs text-zinc-400">{t("items.upgradeUnlocksStates")}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {data.states.map((state) => {
                    const on = draft.unlockStates.includes(state);
                    return (
                      <button
                        key={state}
                        type="button"
                        onClick={() =>
                          update(index, {
                            unlockStates: on
                              ? draft.unlockStates.filter((s) => s !== state)
                              : [...draft.unlockStates, state],
                          })
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${
                          on ? "border-yellow-400 bg-yellow-400/15 text-yellow-300" : "border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {state}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="block text-xs text-zinc-400">
                {t("items.upgradeRequires")}
                <select
                  value={draft.requiresId ?? ""}
                  onChange={(e) => update(index, { requiresId: e.target.value || null })}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                >
                  <option value="">{t("items.upgradeRequiresNone")}</option>
                  {drafts
                    .filter((other) => other.id && other.id !== draft.id)
                    .map((other) => (
                      <option key={other.id} value={other.id}>
                        {other.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void remove(index)}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-300 hover:border-red-500 hover:text-red-400"
                >
                  <Trash2 size={13} /> {t("common.delete")}
                </button>
                <button
                  type="button"
                  onClick={() => void save(index)}
                  disabled={saving !== null || !draft.name.trim() || draft.unlockStates.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg bg-yellow-400 px-3 py-2 text-xs font-black text-black disabled:opacity-50"
                >
                  <Save size={13} /> {t("common.save")}
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setDrafts((list) => [...list, { ...EMPTY, sortOrder: list.length }])}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 py-3 text-sm font-bold text-zinc-300 hover:border-yellow-400 hover:text-yellow-400"
          >
            <Plus size={15} /> {t("items.upgradeAdd")}
          </button>
        </>
      )}
    </section>
  );
}
