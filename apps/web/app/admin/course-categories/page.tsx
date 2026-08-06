"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

interface CourseCategory {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
}

export default function AdminCourseCategoriesPage() {
  const t = useTranslation();
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setCategories(await api.get<CourseCategory[]>("/course-categories"));
    } catch {
      toast.error(t("admin.courseCategoriesLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setSaving(true);
    try {
      await api.post("/admin/course-categories", { slug: newSlug, name: newName, sortOrder: categories.length });
      setNewSlug("");
      setNewName("");
      toast.success(t("admin.courseCategorySaved"));
      await load();
    } catch {
      toast.error(t("admin.courseCategorySaveError"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("admin.courseCategoryConfirmDelete"))) return;
    await api.delete(`/admin/course-categories/${id}`);
    toast.success(t("admin.courseCategoryDeleted"));
    await load();
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-black">{t("admin.courseCategoriesTitle")}</h1>
      <p className="mt-1 text-sm text-zinc-500">{t("admin.courseCategoriesDescription")}</p>

      <div className="mt-6 flex gap-2 rounded-md border border-zinc-800 bg-[#111111] p-4">
        <input
          value={newSlug}
          onChange={(e) => setNewSlug(e.target.value)}
          placeholder={t("admin.learningPathSlug")}
          className="w-40 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white"
        />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("common.title")}
          className="flex-1 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white"
        />
        <button
          type="button"
          onClick={() => void create()}
          disabled={saving || !newSlug || !newName}
          className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50"
        >
          <Plus size={16} />
          {t("common.create")}
        </button>
      </div>

      {loading ? (
        <div className="mt-6 text-zinc-500">{t("common.loading")}</div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between gap-3 border-t border-zinc-800 bg-[#111111] p-4 first:border-t-0">
              <div>
                <p className="font-black">{category.name}</p>
                <p className="text-sm text-zinc-500">/{category.slug}</p>
              </div>
              <button type="button" onClick={() => void remove(category.id)} className="rounded-md border border-zinc-800 p-2 text-red-300">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {categories.length === 0 && <p className="p-4 text-sm text-zinc-500">{t("common.noResults")}</p>}
        </div>
      )}
    </div>
  );
}
