"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GripVertical, Plus } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { Card, DragReorderList, Loader, type DragReorderItem } from "@/shared/ui";
import { coursesService } from "../services/courses-service";

interface Props {
  courseId: string;
}

export function CourseLessonsPanel({ courseId }: Props) {
  const t = useTranslation();
  const [items, setItems] = useState<DragReorderItem[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    coursesService
      .getLessons(courseId)
      .then((lessons) => {
        if (cancelled) return;
        setItems(
          [...lessons]
            .sort((a, b) => a.order - b.order)
            .map((lesson) => ({ id: lesson.id, label: lesson.title ?? t("common.untitled") })),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, t]);

  const handleReorder = async (reordered: DragReorderItem[]) => {
    setItems(reordered);
    setIsSaving(true);
    try {
      await coursesService.reorderLessons(
        reordered.map((item, index) => ({ id: item.id, order: index + 1 })),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical size={18} className="text-[rgb(var(--secondary-text))]" />
          <h2 className="font-medium text-[rgb(var(--text))]">{t("admin.courseLessonsOrder")}</h2>
          {isSaving && <Loader label="" size={14} />}
        </div>
        <Link
          href="/admin/lessons/new"
          className="flex items-center gap-1 text-sm text-[rgb(var(--primary))] hover:opacity-80"
        >
          <Plus size={14} />
          {t("admin.newLesson")}
        </Link>
      </div>
      {items === null ? (
        <Loader label="" size={20} />
      ) : items.length === 0 ? (
        <p className="text-sm text-[rgb(var(--secondary-text))]">{t("admin.noCoursesDescription")}</p>
      ) : (
        <DragReorderList
          items={items}
          onReorder={handleReorder}
          renderActions={(item) => (
            <Link
              href={`/admin/lessons/${item.id}`}
              className="text-xs text-[rgb(var(--primary))] hover:opacity-80"
            >
              {t("common.edit")}
            </Link>
          )}
        />
      )}
    </Card>
  );
}
