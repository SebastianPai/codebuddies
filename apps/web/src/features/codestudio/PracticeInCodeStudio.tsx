"use client";

import { ArrowRight, Hammer } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { codeStudioLink } from "./use-codestudio-summary";

/** Al terminar un ejercicio: invita a usar lo aprendido en CodeStudio. */
export function PracticeInCodeStudio({ className = "" }: { className?: string }) {
  const t = useTranslation();
  return (
    <a
      href={codeStudioLink("tree")}
      className={`flex items-center gap-3 rounded-2xl border border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.08)] p-4 transition hover:bg-[rgb(var(--primary)/0.14)] ${className}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--button))] text-[rgb(var(--button-text))]">
        <Hammer size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-sm font-black">{t("site.codestudioPromo.practiceTitle")}</b>
        <span className="block text-xs text-[rgb(var(--secondary-text))]">{t("site.codestudioPromo.practiceText")}</span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-[rgb(var(--primary))]" />
    </a>
  );
}
