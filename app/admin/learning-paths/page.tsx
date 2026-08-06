"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

interface AdminLearningPath {
  id: string;
  slug: string;
  active: boolean;
  translations: Array<{ languageCode: string; title: string }>;
  _count: { courses: number };
}

export default function AdminLearningPathsPage() {
  const t = useTranslation();
  const [items, setItems] = useState<AdminLearningPath[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await api.get<AdminLearningPath[]>("/admin/learning-paths"));
    } catch {
      toast.error(t("admin.learningPathsLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm(t("admin.learningPathConfirmDelete"))) return;
    await api.delete(`/admin/learning-paths/${id}`);
    toast.success(t("admin.learningPathDeleted"));
    await load();
  };

  return (
    <div className="p-6 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{t("admin.learningPathsTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("admin.learningPathsDescription")}</p>
        </div>
        <Link href="/admin/learning-paths/new" className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-3 font-bold text-black">
          <Plus size={16} />
          {t("common.create")}
        </Link>
      </div>

      {loading ? <div className="mt-8 text-zinc-500">{t("common.loading")}</div> : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        {items.map((item) => {
          const title = item.translations.find((tr) => tr.languageCode === "es")?.title ?? item.translations[0]?.title;
          return (
            <div key={item.id} className="grid gap-3 border-t border-zinc-800 bg-[#111111] p-4 first:border-t-0 lg:grid-cols-[1fr_140px_140px_110px] lg:items-center">
              <div>
                <p className="font-black">{title}</p>
                <p className="mt-1 text-sm text-zinc-500">/{item.slug}</p>
              </div>
              <span className="text-sm text-zinc-400">{item.active ? t("admin.statusActive") : t("admin.statusInactive")}</span>
              <span className="text-sm text-zinc-400">{t("admin.pathCourseCount", { count: item._count.courses })}</span>
              <div className="flex gap-2 lg:justify-end">
                <Link href={`/admin/learning-paths/${item.id}`} className="rounded-md border border-zinc-800 p-2 text-yellow-400">
                  <Edit size={16} />
                </Link>
                <button type="button" onClick={() => void remove(item.id)} className="rounded-md border border-zinc-800 p-2 text-red-300">
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
