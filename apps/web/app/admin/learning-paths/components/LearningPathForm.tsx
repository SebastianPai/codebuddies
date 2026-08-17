"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../../utils/api";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import { DragReorderList, type DragReorderItem, TranslationsForm, type Translation } from "@/shared/ui";

const INITIAL_TRANSLATIONS: Translation[] = [
  { languageCode: "es", title: "", description: "" },
];

interface LearningPathDetail {
  id: string;
  slug: string;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
  translations: Array<{ languageCode: string; title: string; description: string | null }>;
  courses: Array<{ id: string; order: number; title: string | null }>;
}

interface CourseOption {
  id: string;
  title: string;
}

export function LearningPathForm({ pathId }: { pathId?: string }) {
  const t = useTranslation();
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [translations, setTranslations] = useState<Translation[]>(INITIAL_TRANSLATIONS);
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [courseItems, setCourseItems] = useState<DragReorderItem[]>([]);
  const [allCourses, setAllCourses] = useState<CourseOption[]>([]);
  const [addCourseId, setAddCourseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(pathId));

  useEffect(() => {
    api
      .get<Array<{ id: string; title: string }>>("/courses?lang=es")
      .then((courses) => setAllCourses(courses.map((c) => ({ id: c.id, title: c.title }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pathId) return;
    api
      .get<LearningPathDetail>(`/admin/learning-paths/${pathId}`)
      .then((path) => {
        setSlug(path.slug);
        setTranslations(
          path.translations.map((tr) => ({
            languageCode: tr.languageCode,
            title: tr.title,
            description: tr.description ?? "",
          })),
        );
        setActive(path.active);
        setSortOrder(path.sortOrder);
        setCourseItems(path.courses.map((c) => ({ id: c.id, label: c.title ?? t("common.untitled") })));
      })
      .catch(() => toast.error(t("admin.learningPathLoadError")))
      .finally(() => setLoading(false));
  }, [pathId, t]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        slug,
        active,
        sortOrder,
        translations: translations.map((tr) => ({
          languageCode: tr.languageCode,
          title: tr.title,
          description: tr.description || undefined,
        })),
      };
      let id = pathId;
      if (pathId) {
        await api.patch(`/admin/learning-paths/${pathId}`, payload);
      } else {
        const created = await api.post<{ id: string }>("/admin/learning-paths", payload);
        id = created.id;
      }
      if (id) {
        await api.patch(`/admin/learning-paths/${id}/courses`, {
          courseIds: courseItems.map((item) => item.id),
        });
      }
      toast.success(t("admin.learningPathSaved"));
      router.push("/admin/learning-paths");
    } catch {
      toast.error(t("admin.learningPathSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const addCourse = () => {
    if (!addCourseId || courseItems.some((item) => item.id === addCourseId)) return;
    const course = allCourses.find((c) => c.id === addCourseId);
    if (!course) return;
    setCourseItems([...courseItems, { id: course.id, label: course.title }]);
    setAddCourseId("");
  };

  if (loading) return <div className="p-6 text-zinc-500">{t("common.loading")}</div>;

  const availableCourses = allCourses.filter((c) => !courseItems.some((item) => item.id === c.id));

  return (
    <div className="space-y-6 p-6 text-white">
      <h1 className="text-3xl font-black">
        {pathId ? t("admin.editLearningPath") : t("admin.newLearningPath")}
      </h1>

      <div className="grid gap-4 rounded-md border border-zinc-800 bg-[#111111] p-5 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm text-zinc-400">{t("admin.learningPathSlug")}</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-md border border-zinc-800 bg-black px-3 py-3 text-white" />
        </label>
        <div className="md:col-span-2">
          <TranslationsForm translations={translations} onChange={setTranslations} />
        </div>
        <label className="flex items-center justify-between rounded-md border border-zinc-800 bg-black px-3 py-3">
          <span className="text-sm font-bold">{t("admin.pricingPlanActive")}</span>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5 accent-yellow-400" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-zinc-400">{t("admin.pricingPlanSortOrder")}</span>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="w-full rounded-md border border-zinc-800 bg-black px-3 py-3 text-white" />
        </label>
      </div>

      <div className="rounded-md border border-zinc-800 bg-[#111111] p-5">
        <h2 className="mb-4 font-medium">{t("admin.learningPathCourses")}</h2>
        <div className="mb-4 flex gap-2">
          <select value={addCourseId} onChange={(e) => setAddCourseId(e.target.value)} className="flex-1 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white">
            <option value="">{t("admin.selectLessonOption")}</option>
            {availableCourses.map((course) => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
          <button type="button" onClick={addCourse} className="rounded-md bg-yellow-400 px-4 py-2 font-bold text-black">
            {t("common.create")}
          </button>
        </div>
        {courseItems.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("site.pathsEmpty")}</p>
        ) : (
          <DragReorderList
            items={courseItems}
            onReorder={setCourseItems}
            renderActions={(item) => (
              <button
                type="button"
                onClick={() => setCourseItems(courseItems.filter((c) => c.id !== item.id))}
                className="text-xs text-red-300"
              >
                <Trash2 size={14} />
              </button>
            )}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || !slug || !translations.some((tr) => tr.title.trim())}
        className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-3 font-bold text-black disabled:opacity-50"
      >
        <Save size={16} />
        {t("common.save")}
      </button>
    </div>
  );
}
