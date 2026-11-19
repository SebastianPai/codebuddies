"use client";

import { codeStudioLink } from "@/features/codestudio/use-codestudio-summary";
import { useTranslation } from "@/i18n/useTranslation";
import { LoopVideo } from "./LoopVideo";
import { CONTAINER, DISPLAY, Eyebrow, PrimaryButton, RealCaption, Reveal, SectionTitle } from "./ui";

const POINTS = ["tree", "team", "ops"] as const;

// CodeStudio: el paso de aprender a construir. Un clip real del simulador
// (fundar la startup y abrir su primera función); el texto solo nombra lo que
// el simulador hace hoy.
export function HomeStudio() {
  const t = useTranslation();

  return (
    <section className="overflow-hidden py-20 sm:py-28">
      <div className={`${CONTAINER} grid items-center gap-14 lg:grid-cols-12 lg:gap-12`}>
        <Reveal className="lg:col-span-5">
          <Eyebrow>{t("home.studio.eyebrow")}</Eyebrow>
          <SectionTitle>{t("home.studio.title")}</SectionTitle>
          <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--secondary-text))]">{t("home.studio.text")}</p>
          <ol className="mt-8 space-y-6">
            {POINTS.map((point, index) => (
              <li key={point} className="grid grid-cols-[2.25rem_1fr] gap-3">
                <span
                  className={`${DISPLAY} flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--border))] text-sm font-extrabold`}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="font-bold">{t(`home.studio.points.${point}.title`)}</p>
                  <p className="mt-1 leading-relaxed text-[rgb(var(--secondary-text))]">{t(`home.studio.points.${point}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
          <PrimaryButton href={codeStudioLink("guide")} external className="mt-9">
            {t("home.studio.cta")}
          </PrimaryButton>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
            <LoopVideo
              src="/home/studio-start.mp4"
              poster="/home/studio-start-poster.webp"
              width={960}
              height={492}
              label={t("home.studio.clipAlt")}
            />
          </div>
          <RealCaption className="mt-4">{t("home.studio.clipCaption")}</RealCaption>
        </Reveal>
      </div>
    </section>
  );
}
