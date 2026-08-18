"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useTranslation } from "../../../src/i18n/useTranslation";

export default function WelcomePage() {
  const t = useTranslation();

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 text-[rgb(var(--text))]">
      <main className="max-w-xl rounded-xl border-4 border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8 text-center">
        <Sparkles className="mx-auto text-[rgb(var(--primary))]" size={40} />
        <h1 className="mt-4 text-3xl font-black uppercase text-[rgb(var(--primary))]">
          {t("pricing.welcome.title")}
        </h1>
        <p className="mt-4 text-[rgb(var(--secondary-text))]">{t("pricing.welcome.body")}</p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-[rgb(var(--primary))] px-6 py-3 font-black uppercase text-[rgb(var(--button-text))]"
        >
          {t("pricing.welcome.cta")}
        </Link>
      </main>
    </div>
  );
}
