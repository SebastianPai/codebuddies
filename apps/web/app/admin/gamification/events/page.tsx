"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../../utils/api";
import { Field, Textarea, Toggle } from "../components/AdminFields";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import { useConfirm } from "@/shared/ui";

type EventItem = {
  id: string;
  name: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
};

export default function AdminEventsPage() {
  const t = useTranslation();
  const { confirm, ConfirmDialog } = useConfirm();
  const [items, setItems] = useState<EventItem[]>([]);
  const [form, setForm] = useState({ name: "", description: "", startsAt: "", endsAt: "", active: true });

  const load = async () => setItems(await api.get<EventItem[]>("/admin/gamification/events"));

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    await api.post("/admin/gamification/events", {
      ...form,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
    });
    setForm({ name: "", description: "", startsAt: "", endsAt: "", active: true });
    toast.success(t("gamification.eventCreated"));
    await load();
  };

  const remove = async (id: string) => {
    if (!(await confirm(t("gamification.confirmDeleteEvent")))) return;
    await api.delete(`/admin/gamification/events/${id}`);
    await load();
  };

  return (
    <div className="grid gap-6 p-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-md border border-zinc-800 bg-[#111111] p-5">
        <h1 className="text-3xl font-black">{t("gamification.events")}</h1>
        <div className="mt-5 space-y-4">
          <Field label={t("items.name")} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <Textarea label={t("items.description")} value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
          <Field label={t("gamification.start")} type="datetime-local" value={form.startsAt} onChange={(value) => setForm((current) => ({ ...current, startsAt: value }))} />
          <Field label={t("gamification.end")} type="datetime-local" value={form.endsAt} onChange={(value) => setForm((current) => ({ ...current, endsAt: value }))} />
          <Toggle label={t("gamification.activeMale")} checked={form.active} onChange={(value) => setForm((current) => ({ ...current, active: value }))} />
          <button type="button" onClick={() => void create()} className="rounded-md bg-yellow-400 px-4 py-3 font-bold text-black">{t("gamification.createEvent")}</button>
        </div>
      </section>
      <section className="rounded-md border border-zinc-800 bg-[#111111] p-5">
        <h2 className="text-xl font-black">{t("gamification.list")}</h2>
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-black p-3">
              <div>
                <p className="font-black">{item.name}</p>
                <p className="text-sm text-zinc-500">
                  {item.startsAt ? new Date(item.startsAt).toLocaleString("es-CO") : t("gamification.noStart")} ·{" "}
                  {item.endsAt ? new Date(item.endsAt).toLocaleString("es-CO") : t("gamification.noEnd")}
                </p>
              </div>
              <button type="button" onClick={() => void remove(item.id)} className="text-red-300" aria-label={t("gamification.deleteNamed", { name: item.name })}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
      {ConfirmDialog}
    </div>
  );
}
