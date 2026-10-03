"use client";

import { ArrowRight, BookOpen, Building2, Trophy } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { codeStudioLink } from "./use-codestudio-summary";

// Sección de la home: "Aprende, construye, compite". Con el estilo de la
// landing (mayúsculas enormes, bordes negros, sombras duras desplazadas).
export function HomeCodeStudio() {
  const t = useTranslation();
  const steps = [
    { key: "learn", icon: <BookOpen size={26} strokeWidth={2.25} /> },
    { key: "build", icon: <Building2 size={26} strokeWidth={2.25} /> },
    { key: "compete", icon: <Trophy size={26} strokeWidth={2.25} /> },
  ];

  return (
    <section className="border-b-4 border-black py-24">
      <div className="mx-auto max-w-7xl px-6">
        <p className="font-mono text-sm uppercase text-[rgb(var(--primary))]">{t("site.codestudioPromo.homeEyebrow")}</p>
        <h2 className="mt-3 text-5xl font-black uppercase leading-none tracking-tighter md:text-7xl">
          {t("site.codestudioPromo.homeTitle")}
        </h2>
        <p className="mt-5 max-w-2xl text-lg text-[rgb(var(--secondary-text))]">{t("site.codestudioPromo.homeText")}</p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className="relative border-2 border-black bg-[rgb(var(--card))] p-6 shadow-[8px_8px_0_0_#000] transition-transform duration-300 hover:-translate-y-1"
            >
              <span className="absolute -top-4 right-4 border-2 border-black bg-[rgb(var(--primary))] px-3 py-0.5 font-mono text-xs font-black text-black">
                0{index + 1}
              </span>
              <span className="flex h-12 w-12 items-center justify-center border-2 border-black bg-[rgb(var(--primary))] text-black">{step.icon}</span>
              <h3 className="mt-4 text-2xl font-black uppercase tracking-tight">{t(`site.codestudioPromo.home.${step.key}.title`)}</h3>
              <p className="mt-2 text-[rgb(var(--secondary-text))]">{t(`site.codestudioPromo.home.${step.key}.text`)}</p>
            </div>
          ))}
        </div>

        <a
          href={codeStudioLink("guide")}
          className="mt-12 inline-flex items-center gap-3 border-2 border-black bg-[rgb(var(--primary))] px-8 py-4 text-xl font-black uppercase text-black shadow-[6px_6px_0_0_#000] transition-all hover:-translate-y-1 active:translate-y-0.5"
        >
          {t("site.codestudioPromo.homeCta")} <ArrowRight size={22} />
        </a>
      </div>
    </section>
  );
}
