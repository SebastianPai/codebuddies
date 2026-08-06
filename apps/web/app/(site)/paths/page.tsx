"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Map } from "lucide-react";
import { api } from "../../../src/shared/api";
import { Skeleton } from "../../../src/shared/ui";
import { useTranslation } from "../../../src/i18n/useTranslation";

interface LearningPathSummary {
  id: string;
  slug: string;
  imageUrl: string | null;
  title: string | null;
  description: string | null;
  courseCount: number;
  courses: Array<{ id: string; order: number; title: string | null }>;
}

export default function LearningPathsPage() {
  const t = useTranslation();
  const [paths, setPaths] = useState<LearningPathSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    let cancelled = false;
    api
      .get<LearningPathSummary[]>("/learning-paths")
      .then((data) => {
        if (cancelled) return;
        setPaths(data);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="py-12">
      <section className="text-center">
        <p className="font-mono text-sm uppercase text-[rgb(var(--primary))]">{t("site.pathsLabel")}</p>
        <h1 className="mt-4 text-5xl font-black text-[rgb(var(--text))]">{t("site.pathsTitle")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-[rgb(var(--secondary-text))]">{t("site.pathsDescription")}</p>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        {status === "loading" ? (
          <>
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </>
        ) : status === "error" ? (
          <p className="col-span-full text-center text-[rgb(var(--secondary-text))]">{t("common.unexpectedError")}</p>
        ) : paths.length === 0 ? (
          <p className="col-span-full text-center text-[rgb(var(--secondary-text))]">{t("site.pathsEmpty")}</p>
        ) : (
          paths.map((path) => (
            <Link
              key={path.id}
              href={`/paths/${path.slug}`}
              className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 transition hover:border-[rgb(var(--primary))]"
            >
              <Map className="text-[rgb(var(--primary))]" />
              <h2 className="mt-4 text-2xl font-black">{path.title}</h2>
              {path.description && <p className="mt-2 text-sm text-[rgb(var(--secondary-text))]">{path.description}</p>}
              <p className="mt-4 text-xs uppercase text-[rgb(var(--secondary-text))]">
                {t("site.pathCourseCount", { count: path.courseCount })}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[rgb(var(--primary))]">
                {t("site.pathViewCta")} <ArrowRight size={14} />
              </span>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
