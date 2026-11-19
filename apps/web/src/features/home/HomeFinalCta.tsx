"use client";

import { useTranslation } from "@/i18n/useTranslation";
import { CONTAINER, DISPLAY, PrimaryButton, Reveal, SecondaryButton } from "./ui";

// Cierre corto: una sola idea y la acción. La lección 1 sin cuenta ya se
// ofrece en cada curso; acá la acción principal es crear la cuenta.
export function HomeFinalCta() {
  const t = useTranslation();

  return (
    <section className="pb-24 pt-4 sm:pb-32">
      <div className={CONTAINER}>
        <Reveal className="relative overflow-hidden rounded-[2rem] border border-[rgb(var(--border)/0.6)] bg-[rgb(var(--card))] px-6 py-14 text-center sm:px-12 sm:py-20">
          <h2
            className={`${DISPLAY} mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-5xl`}
          >
            {t("home.final.title")}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[rgb(var(--secondary-text))]">{t("home.final.text")}</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <PrimaryButton href="/register">{t("home.final.primary")}</PrimaryButton>
            <SecondaryButton href="/login">{t("home.final.secondary")}</SecondaryButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
