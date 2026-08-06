"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../../utils/api";
import { Field, Textarea, Toggle } from "../components/AdminFields";
import { useTranslation } from "../../../../src/i18n/useTranslation";

type Category = { id: string; name: string; description?: string; icon?: string; color?: string; active: boolean };

export default function AdminMissionCategoriesPage() {
  const t = useTranslation();
  const [items, setItems] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", description: "", icon: "Target", color: "#d5ff3f", active: true, sortOrder: 0 });

  const load = async () => setItems(await api.get<Category[]>("/admin/gamification/categories"));

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    await api.post("/admin/gamification/categories", form);
    setForm({ name: "", description: "", icon: "Target", color: "#d5ff3f", active: true, sortOrder: 0 });
    toast.success(t("gamification.categoryCreated"));
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("gamification.confirmDeleteCategory"))) return;
    await api.delete(`/admin/gamification/categories/${id}`);
    await load();
  };

  return (
    <div className="grid gap-6 p-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-md border border-zinc-800 bg-[#111111] p-5">
        <h1 className="text-3xl font-black">{t("gamification.categories")}</h1>
        <div className="mt-5 space-y-4">
          <Field label={t("items.name")} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <Textarea label={t("items.description")} value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
          <Field label={t("gamification.icon")} value={form.icon} onChange={(value) => setForm((current) => ({ ...current, icon: value }))} />
          <Toggle label={t("gamification.activeFemale")} checked={form.active} onChange={(value) => setForm((current) => ({ ...current, active: value }))} />
          <button type="button" onClick={() => void create()} className="rounded-md bg-yellow-400 px-4 py-3 font-bold text-black">{t("gamification.createCategory")}</button>
        </div>
      </section>
      <section className="rounded-md border border-zinc-800 bg-[#111111] p-5">
        <h2 className="text-xl font-black">{t("gamification.list")}</h2>
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-black p-3">
              <div>
                <p className="font-black">{item.name}</p>
                <p className="text-sm text-zinc-500">{item.description}</p>
              </div>
              <button type="button" onClick={() => void remove(item.id)} className="text-red-300" aria-label={t("gamification.deleteNamed", { name: item.name })}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
