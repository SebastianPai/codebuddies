"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "../../../src/i18n/useTranslation";

type Layout = {
  id: string;
  name: string;
  previewImageUrl?: string;
  width: number;
  height: number;
};

export default function LayoutsPage() {
  const t = useTranslation();
  const [layouts, setLayouts] = useState<Layout[]>([]);

  async function loadLayouts() {
    try {
      const res = await fetch("http://localhost:3001/layouts");
      if (!res.ok) throw new Error(t("admin.loadLayoutsError"));
      const data = await res.json();
      setLayouts(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteLayout(id: string) {
    if (!confirm(t("admin.confirmDeleteLayout"))) return;

    try {
      await fetch(`http://localhost:3001/layouts/${id}`, { method: "DELETE" });
      loadLayouts();
    } catch (err) {
      console.error(err);
      alert(t("admin.deleteLayoutError"));
    }
  }

  useEffect(() => {
    loadLayouts();
  }, []);

  return (
    <div className="p-10 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-yellow-400">{t("admin.layoutsTitle")}</h1>

        <Link
          href="/admin/layouts/new"
          className="bg-yellow-400 hover:bg-yellow-300 text-black px-6 py-2.5 rounded font-medium transition"
        >
          {t("admin.createNewLayoutLink")}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {layouts.map((layout) => (
          <div
            key={layout.id}
            className="bg-[#111] border border-zinc-800 rounded-xl p-5 hover:border-yellow-400 transition-all group"
          >
            <div className="aspect-video bg-[#0a0a0a] rounded-lg overflow-hidden mb-4 border border-zinc-800">
              {layout.previewImageUrl ? (
                <img
                  src={layout.previewImageUrl}
                  alt={layout.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  {t("site.noPreviewText")}
                </div>
              )}
            </div>

            <h3 className="font-semibold text-lg text-white mb-1">
              {layout.name}
            </h3>

            <p className="text-sm text-zinc-500">
              {t("admin.layoutSizeLabel", { width: layout.width, height: layout.height })}
            </p>

            <div className="flex justify-between mt-6 pt-4 border-t border-zinc-800">
              <Link
                href={`/admin/layouts/${layout.id}`}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                {t("common.edit")}
              </Link>
              <button
                onClick={() => deleteLayout(layout.id)}
                className="text-red-400 hover:text-red-300 text-sm font-medium"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>

      {layouts.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          {t("admin.noLayoutsYet")}
        </div>
      )}
    </div>
  );
}
