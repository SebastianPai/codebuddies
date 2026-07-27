"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

const resources = [
  ["appTypes", "admin.codestudioResourceAppTypes"],
  ["modules", "admin.modules"],
  ["technologies", "admin.codestudioResourceTechnologies"],
  ["research", "admin.codestudioResourceResearch"],
  ["campaigns", "admin.codestudioResourceCampaigns"],
  ["events", "gamification.events"],
  ["employees", "admin.codestudioResourceEmployees"],
  ["infrastructure", "admin.codestudioResourceInfrastructure"],
  ["achievements", "gamification.achievements"],
  ["blueprints", "admin.codestudioResourceBlueprints"],
];

const emptyByResource: Record<string, Record<string, any>> = {
  appTypes: { slug: "", name: "", category: "", difficulty: 1, active: true, visible: true, order: 0 },
  modules: { slug: "", name: "", category: "", difficulty: 1, cost: 100, developmentSeconds: 60, experience: 10, visible: true, active: true, order: 0 },
  technologies: { slug: "", name: "", category: "", cost: 250, active: true, order: 0 },
  research: { slug: "", name: "", durationSeconds: 300, cost: 500, active: true, order: 0 },
  campaigns: { slug: "", name: "", channel: "", baseCost: 100, active: true, order: 0 },
  events: { slug: "", name: "", category: "", severity: 1, weight: 10, active: true },
  employees: { slug: "", name: "", category: "", salary: 100, active: true, order: 0 },
  infrastructure: { slug: "", name: "", category: "Infraestructura", baseCost: 200, active: true, order: 0 },
  achievements: { slug: "", name: "", active: true, order: 0 },
  blueprints: { appTypeId: "", name: "", version: 1 },
};

export default function AdminCodeStudioPage() {
  const t = useTranslation();
  const [resource, setResource] = useState("appTypes");
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [json, setJson] = useState(JSON.stringify(emptyByResource.appTypes, null, 2));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const titleKey = useMemo(() => resources.find(([key]) => key === resource)?.[1] ?? resource, [resource]);

  const load = async (nextResource = resource) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<any[]>(`/admin/codestudio/${nextResource}`);
      setItems(data);
      setSelected(null);
      setJson(JSON.stringify(emptyByResource[nextResource] ?? {}, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.codestudioLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(resource);
  }, [resource]);

  const edit = (item: any) => {
    setSelected(item);
    setJson(JSON.stringify(item, null, 2));
  };

  const save = async () => {
    try {
      const payload = JSON.parse(json);
      if (selected?.id) await api.patch(`/admin/codestudio/${resource}/${selected.id}`, payload);
      else await api.post(`/admin/codestudio/${resource}`, payload);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.codestudioSaveError"));
    }
  };

  const remove = async (item: any) => {
    if (!item?.id) return;
    await api.delete(`/admin/codestudio/${resource}/${item.id}`);
    await load();
  };

  return (
    <div className="space-y-6 p-8 text-white">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">{t("admin.codestudioCmsLabel")}</p>
        <h1 className="mt-2 text-4xl font-black">CodeStudio</h1>
        <p className="mt-2 text-zinc-400">{t("admin.codestudioDescription")}</p>
      </div>

      {error && <div className="rounded-2xl border border-red-900 bg-red-950/40 p-4 text-red-100">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {resources.map(([key, labelKey]) => (
          <button
            key={key}
            onClick={() => setResource(key)}
            className={`rounded-full border px-4 py-2 text-sm font-black ${
              resource === key ? "border-yellow-400 bg-yellow-400 text-black" : "border-zinc-800 bg-[#111] text-zinc-300"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_520px]">
        <section className="rounded-3xl border border-zinc-800 bg-[#111] p-5">
          <h2 className="text-2xl font-black text-yellow-400">{t(titleKey)}</h2>
          {loading ? (
            <div className="mt-5 h-40 animate-pulse rounded-2xl bg-zinc-900" />
          ) : (
            <div className="mt-5 overflow-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-zinc-500">
                  <tr>
                    <th className="p-3">{t("items.name")}</th>
                    <th className="p-3">{t("admin.slugColumn")}</th>
                    <th className="p-3">{t("items.category")}</th>
                    <th className="p-3">{t("gamification.activeMale")}</th>
                    <th className="p-3">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-zinc-800">
                      <td className="p-3 font-bold">{item.name ?? item.title ?? item.id}</td>
                      <td className="p-3 text-zinc-400">{item.slug ?? "-"}</td>
                      <td className="p-3 text-zinc-400">{item.category ?? item.channel ?? "-"}</td>
                      <td className="p-3">{item.active === false ? t("common.no") : t("common.yes")}</td>
                      <td className="flex gap-2 p-3">
                        <button onClick={() => edit(item)} className="rounded-xl bg-yellow-400 px-3 py-2 font-black text-black">{t("common.edit")}</button>
                        <button onClick={() => void remove(item)} className="rounded-xl border border-red-900 px-3 py-2 text-red-200">{t("common.delete")}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-[#111] p-5">
          <h2 className="text-2xl font-black">{selected ? t("admin.editRecordTitle") : t("admin.createRecordTitle")}</h2>
          <textarea
            value={json}
            onChange={(event) => setJson(event.target.value)}
            className="mt-4 h-[520px] w-full rounded-2xl border border-zinc-800 bg-black p-4 font-mono text-sm text-emerald-100 outline-none focus:border-yellow-400"
          />
          <div className="mt-4 flex gap-2">
            <button onClick={() => void save()} className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black">{t("common.save")}</button>
            <button
              onClick={() => {
                setSelected(null);
                setJson(JSON.stringify(emptyByResource[resource] ?? {}, null, 2));
              }}
              className="rounded-2xl border border-zinc-700 px-5 py-3 font-black text-zinc-200"
            >
              {t("admin.newButton")}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
