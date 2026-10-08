"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { useTranslation } from "../../src/i18n/useTranslation";

export default function ErrorScreen({
  digest,
  onRetry,
}: {
  digest?: string;
  onRetry: () => void;
}) {
  const t = useTranslation();
  return (
    <section className="mx-auto flex min-h-[60dvh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--error)/0.12)] text-[rgb(var(--error-text))]">
        <AlertTriangle size={28} />
      </span>
      <h1 className="mt-5 text-3xl font-black text-[rgb(var(--text))]">
        {t("site.errorPage.title")}
      </h1>
      <p className="mt-3 text-[rgb(var(--secondary-text))]">{t("site.errorPage.body")}</p>
      <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[rgb(var(--button))] px-5 py-3 text-sm font-black uppercase text-[rgb(var(--button-text))] transition hover:brightness-110"
        >
          <RotateCcw size={16} />
          {t("site.errorPage.retry")}
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[rgb(var(--border))] px-5 py-3 text-sm font-black uppercase text-[rgb(var(--text))]"
        >
          <Home size={16} />
          {t("site.notFound.home")}
        </Link>
      </div>
      {digest && (
        <p className="mt-6 font-mono text-[11px] text-[rgb(var(--secondary-text))]">
          {t("site.errorPage.reference")}: {digest}
        </p>
      )}
    </section>
  );
}
