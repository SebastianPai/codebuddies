"use client";

import Link from "next/link";
import { BookOpen, Gamepad2, Target } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { codeStudioLink, useCodeStudioSummary } from "./use-codestudio-summary";

/** "Más formas de ganar XP": aprender, misiones y CodeStudio. */
export function EarnXpWays() {
  const t = useTranslation();
  const { data } = useCodeStudioSummary();
  const cap = data?.gameXpCap ?? 300;
  const today = data?.gameXpToday ?? 0;

  const ways = [
    { key: "learn", icon: <BookOpen size={20} />, href: "/courses", external: false },
    { key: "missions", icon: <Target size={20} />, href: "/missions", external: false },
    { key: "codestudio", icon: <Gamepad2 size={20} />, href: codeStudioLink("panel"), external: true },
  ] as const;

  const className =
    "block rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4 transition hover:-translate-y-0.5 hover:border-[rgb(var(--primary))]";

  return (
    <section className="mb-8 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
      <h2 className="text-2xl font-black tracking-tight">{t("site.codestudioPromo.waysTitle")}</h2>
      <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">{t("site.codestudioPromo.waysText")}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {ways.map((way) => {
          const body = (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--button))] text-[rgb(var(--button-text))]">{way.icon}</span>
              <b className="mt-3 block text-base font-black">{t(`site.codestudioPromo.ways.${way.key}.title`)}</b>
              <span className="mt-1 block text-sm text-[rgb(var(--secondary-text))]">
                {way.key === "codestudio" ? t("site.codestudioPromo.ways.codestudio.text", { cap, today }) : t(`site.codestudioPromo.ways.${way.key}.text`)}
              </span>
            </>
          );
          return way.external ? (
            <a key={way.key} href={way.href} className={className}>
              {body}
            </a>
          ) : (
            <Link key={way.key} href={way.href} className={className}>
              {body}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
