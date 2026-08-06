"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "../../../../src/shared/api";
import { Skeleton } from "../../../../src/shared/ui";
import { useTranslation } from "../../../../src/i18n/useTranslation";

interface LearningPathCourse {
  id: string;
  order: number;
  title: string | null;
  difficulty: string;
}

interface LearningPathDetail {
  id: string;
  slug: string;
  imageUrl: string | null;
  title: string | null;
  description: string | null;
  courses: LearningPathCourse[];
}

export default function LearningPathDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTranslation();
  const [path, setPath] = useState<LearningPathDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    api
      .get<LearningPathDetail>(`/learning-paths/${slug}`)
      .then((data) => {
        if (cancelled) return;
        setPath(data);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="py-12">
        <Skeleton className="mx-auto h-10 w-2/3" />
        <div className="mt-8 space-y-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>
    );
  }

  if (status === "error" || !path) {
    return <p className="py-20 text-center text-[rgb(var(--secondary-text))]">{t("common.unexpectedError")}</p>;
  }

  return (
    <div className="py-12">
      <section className="text-center">
        <p className="font-mono text-sm uppercase text-[rgb(var(--primary))]">{t("site.pathsLabel")}</p>
        <h1 className="mt-4 text-5xl font-black text-[rgb(var(--text))]">{path.title}</h1>
        {path.description && (
          <p className="mx-auto mt-4 max-w-2xl text-[rgb(var(--secondary-text))]">{path.description}</p>
        )}
      </section>

      <section className="mx-auto mt-12 max-w-2xl space-y-4">
        {path.courses.map((course, index) => (
          <div
            key={course.id}
            className="flex items-center gap-4 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--primary))]/10 font-black text-[rgb(var(--primary))]">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold">{course.title}</h2>
              <p className="text-xs uppercase text-[rgb(var(--secondary-text))]">{course.difficulty}</p>
            </div>
            <Link
              href={`/courses/${course.id}`}
              className="flex items-center gap-1 whitespace-nowrap rounded-full bg-[rgb(var(--primary))] px-4 py-2 text-sm font-bold text-black"
            >
              {t("site.pathViewCta")} <ArrowRight size={14} />
            </Link>
          </div>
        ))}
        {path.courses.length === 0 && (
          <p className="text-center text-[rgb(var(--secondary-text))]">{t("site.pathsEmpty")}</p>
        )}
      </section>
    </div>
  );
}
