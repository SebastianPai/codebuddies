"use client";

import Link from "next/link";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function ExerciseResultPlaceholderPage() {
  const t = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background))] px-4 text-[rgb(var(--text))]">
      <main className="max-w-xl rounded-xl border-4 border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8 text-center">
        <h1 className="text-3xl font-black uppercase text-[rgb(var(--primary))]">
          {t("site.exerciseResultTitle")}
        </h1>
        <p className="mt-4 text-[rgb(var(--secondary-text))]">
          {t("site.exerciseResultDescription")}
        </p>
        <Link
          href="/courses"
          className="mt-8 inline-flex rounded-lg bg-[rgb(var(--primary))] px-6 py-3 font-black uppercase text-black"
        >
          {t("site.backToCourses")}
        </Link>
      </main>
    </div>
  );
}
