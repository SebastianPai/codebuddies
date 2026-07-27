"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "../../../../../src/i18n/useTranslation";

export default function CertificatePurchasePlaceholderPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const t = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background))] px-4 text-[rgb(var(--text))]">
      <main className="max-w-xl rounded-xl border-4 border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8 text-center">
        <h1 className="text-3xl font-black uppercase text-[rgb(var(--primary))]">
          {t("site.buyCertificateTitle")}
        </h1>
        <p className="mt-4 text-[rgb(var(--secondary-text))]">
          {t("site.buyCertificateDescription")}
        </p>
        <p className="mt-4 font-mono text-xs text-[rgb(var(--secondary-text))]">
          {t("site.courseIdLabel", { course: courseId })}
        </p>
        <Link
          href={`/courses/${courseId}`}
          className="mt-8 inline-flex rounded-lg bg-[rgb(var(--primary))] px-6 py-3 font-black uppercase text-black"
        >
          {t("site.backToCourse")}
        </Link>
      </main>
    </div>
  );
}
