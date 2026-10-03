"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/shared/api/client";
import { useTranslation } from "@/i18n/useTranslation";

// Ropa de empleados: qué items de avatar pueden usar los empleados de
// CodeStudio. Cada empleado se arma por piezas con lo marcado aquí (al azar,
// siempre igual para la misma persona); en los slots sin nada marcado usa
// el item por defecto.

type WardrobeItem = { id: string; name: string; slot: string; imageUrl: string | null; isDefault: boolean; wear: boolean };

export default function EmployeeWardrobe() {
  const t = useTranslation();
  const [items, setItems] = useState<WardrobeItem[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<WardrobeItem[]>("/admin/codestudio/wardrobe/items")
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const bySlot = useMemo(() => {
    const groups = new Map<string, WardrobeItem[]>();
    for (const item of items ?? []) groups.set(item.slot, [...(groups.get(item.slot) ?? []), item]);
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  async function toggle(item: WardrobeItem) {
    setSaving(item.id);
    try {
      await api.patch(`/admin/codestudio/wardrobe/items/${item.id}`, { wear: !item.wear });
      setItems((current) => (current ?? []).map((entry) => (entry.id === item.id ? { ...entry, wear: !entry.wear } : entry)));
    } catch (err: any) {
      alert(err?.message || "Error");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-zinc-800 bg-[#111] p-6">
      <div>
        <h2 className="text-xl font-bold text-white">{t("admin.wardrobeTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">{t("admin.wardrobeHint")}</p>
      </div>
      {items === null && <p className="text-sm text-zinc-500">{t("admin.loading")}</p>}
      {items !== null && items.length === 0 && <p className="text-sm text-zinc-500">{t("admin.wardrobeEmpty")}</p>}
      {bySlot.map(([slot, group]) => (
        <div key={slot} className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">{slot}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {group.map((item) => (
              <label
                key={item.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${item.wear ? "border-yellow-400 bg-yellow-400/10" : "border-zinc-800 hover:border-zinc-600"}`}
              >
                <input type="checkbox" className="h-4 w-4 accent-yellow-400" checked={item.wear} disabled={saving === item.id} onChange={() => void toggle(item)} />
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="h-10 w-10 flex-none object-contain [image-rendering:pixelated]" />
                ) : (
                  <span className="h-10 w-10 flex-none rounded bg-zinc-800" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{item.name}</span>
                  {item.isDefault && <span className="text-xs text-zinc-500">{t("admin.wardrobeDefault")}</span>}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
