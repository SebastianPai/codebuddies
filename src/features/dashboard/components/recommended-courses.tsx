"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { api } from "@/shared/api";
import { Skeleton } from "@/shared/ui";

interface RecommendedCourse {
  id: string;
  title: string | null;
  description: string | null;
  difficulty: string;
  imageUrl: string | null;
  categories: Array<{ id: string; slug: string; name: string }>;
}

export function RecommendedCourses() {
  const t = useTranslation();
  const [courses, setCourses] = useState<RecommendedCourse[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<RecommendedCourse[]>("/courses/recommendations")
      .then((data) => {
        if (!cancelled) setCourses(data);
      })
      .catch(() => {
        if (!cancelled) setCourses([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (courses !== null && courses.length === 0) return null;

  return (
    <section className="mt-6 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
      <div className="mb-5 flex items-center gap-3">
        <Sparkles className="text-[rgb(var(--primary))]" />
        <h2 className="text-2xl font-black">{t("dashboard.recommendedForYou")}</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses === null
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          : courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4 transition hover:border-[rgb(var(--primary))]"
              >
                <p className="text-xs font-bold uppercase text-[rgb(var(--primary))]">{course.difficulty}</p>
                <h3 className="mt-1 truncate font-bold">{course.title}</h3>
                {course.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-[rgb(var(--secondary-text))]">{course.description}</p>
                )}
              </Link>
            ))}
      </div>
    </section>
  );
}
