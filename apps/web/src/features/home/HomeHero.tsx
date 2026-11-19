"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { HomeParallax } from "../../../components/HomeParallax";
import { useTranslation } from "@/i18n/useTranslation";
import { LoopVideo } from "./LoopVideo";
import { CONTAINER, DISPLAY, PrimaryButton, RealCaption, SecondaryButton } from "./ui";

// Primera impresión: esto es para APRENDER a programar. El protagonista es un
// ejercicio real en movimiento (se escribe, se comprueba, Buddy responde); el
// mundo del juego aparece como complemento, chico. El fondo parallax de
// /admin/theme-assets sigue funcionando igual.
export function HomeHero() {
  const t = useTranslation();

  return (
    <section className="relative isolate">
      <HomeParallax />
      <div
        className={`${CONTAINER} relative z-10 grid items-center gap-14 pb-20 pt-32 sm:pt-36 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:pb-28 lg:pt-44`}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--background)/0.6)] px-3 py-1 text-xs font-semibold text-[rgb(var(--secondary-text))] backdrop-blur">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary))]" />
            {t("home.hero.eyebrow")}
          </p>
          <h1
            className={`${DISPLAY} mt-6 text-balance text-5xl font-extrabold leading-[0.98] tracking-[-0.03em] sm:text-6xl lg:text-[4.25rem]`}
          >
            {t("home.hero.title")}{" "}
            <span className="text-[rgb(var(--primary))]">{t("home.hero.titleAccent")}</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-[rgb(var(--text)/0.88)] [text-shadow:0_1px_14px_rgba(0,0,0,0.75)]">{t("home.hero.text")}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton href="/register">{t("home.hero.ctaPrimary")}</PrimaryButton>
            <SecondaryButton href="#cursos" className="bg-[rgb(var(--background)/0.5)] backdrop-blur">
              {t("home.hero.ctaSecondary")}
            </SecondaryButton>
          </div>
          <p className="mt-5 text-sm text-[rgb(var(--secondary-text))]">{t("home.hero.note")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="relative pb-16 sm:pb-20"
        >
          <figure>
            <div className="overflow-hidden rounded-3xl bg-[#0c0e12] ring-1 ring-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
              <LoopVideo
                src="/home/learn-code.mp4"
                poster="/home/learn-code-poster.webp"
                width={810}
                height={620}
                label={t("home.hero.exerciseAlt")}
              />
            </div>
            <RealCaption className="mt-3 justify-end text-[rgb(var(--text)/0.8)]">{t("home.hero.exerciseCaption")}</RealCaption>
          </figure>

          {/* El mundo, como complemento: chico, abajo a la izquierda (zona vacía del
              clip, para no tapar el botón Comprobar). */}
          <figure className="absolute bottom-0 left-0 hidden w-[34%] sm:block max-w-[210px] -translate-x-2 sm:-translate-x-6 lg:-translate-x-10">
            <div className="overflow-hidden rounded-2xl bg-[#0f1219] ring-1 ring-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
              <Image
                src="/home/world-house-sm.webp"
                alt={t("home.hero.worldAlt")}
                width={640}
                height={484}
                sizes="210px"
                className="h-auto w-full"
              />
            </div>
            <figcaption className="mt-2 text-xs font-semibold text-[rgb(var(--text)/0.8)]">
              {t("home.hero.worldCaption")}
            </figcaption>
          </figure>
        </motion.div>
      </div>
    </section>
  );
}
