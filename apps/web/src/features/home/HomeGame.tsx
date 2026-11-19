"use client";

import { Blocks, Shirt, Store, Users } from "lucide-react";
import { getGameUrl } from "@/config/env";
import { useTranslation } from "@/i18n/useTranslation";
import { LoopVideo } from "./LoopVideo";
import { CONTAINER, DISPLAY, PIXEL, PrimaryButton, Reveal } from "./ui";

const FEATURES = [
  { key: "build", icon: Blocks },
  { key: "avatar", icon: Shirt },
  { key: "rooms", icon: Users },
  { key: "shop", icon: Store },
] as const;

// "Aprende jugando": el diferencial. Banda oscura fija y solo clips reales del
// juego (MP4 livianos que se cargan al verse): una casa armándose, el avatar
// caminando con el HUD, el paso del día a la noche y el PC de la sala
// abriendo CodeStudio.
export function HomeGame() {
  const t = useTranslation();

  return (
    <section className="relative overflow-hidden bg-[#0f1219] py-20 text-white sm:py-28">
      <div className={CONTAINER}>
        <div className="grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-16">
          <Reveal className="lg:col-span-5">
            <p className={`${PIXEL} text-sm uppercase tracking-[0.12em] text-[#facc15]`}>{t("home.game.eyebrow")}</p>
            <h2 className={`${DISPLAY} mt-3 text-balance text-4xl font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-6xl`}>
              {t("home.game.title")}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/75">{t("home.game.text")}</p>
            <PrimaryButton
              href={getGameUrl()}
              external
              className="mt-8 bg-[#facc15]! text-[#111827]!"
            >
              {t("home.game.cta")}
            </PrimaryButton>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-7">
            <ul className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {FEATURES.map(({ key, icon: Icon }) => (
                <li key={key} className="flex gap-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[#facc15] ring-1 ring-white/10">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-bold">{t(`home.game.features.${key}.title`)}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/65">{t(`home.game.features.${key}.text`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
          <Reveal>
            <figure>
              <div className="overflow-hidden rounded-2xl bg-[#0f1219] ring-1 ring-white/10 sm:rounded-3xl">
                <LoopVideo
                  src="/home/world-build.mp4"
                  poster="/home/world-build-poster.webp"
                  width={860}
                  height={600}
                  label={t("home.game.buildAlt")}
                />
              </div>
              <figcaption className="mt-3 font-semibold text-white/85">{t("home.game.buildCaption")}</figcaption>
            </figure>
          </Reveal>
          <Reveal delay={0.08}>
            <figure>
              <div className="overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.6)] sm:rounded-3xl">
                <LoopVideo
                  src="/home/game-walk.mp4"
                  poster="/home/game-walk-poster.webp"
                  width={1120}
                  height={630}
                  label={t("home.game.screenAlt")}
                />
              </div>
              <figcaption className="mt-3 font-semibold text-white/85">{t("home.game.screenCaption")}</figcaption>
            </figure>
          </Reveal>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-10">
          <Reveal>
            <figure>
              <div className="overflow-hidden rounded-2xl bg-[#34435a] ring-1 ring-white/10">
                <LoopVideo
                  src="/home/world-night.mp4"
                  poster="/home/world-night-poster.webp"
                  width={800}
                  height={576}
                  label={t("home.game.nightAlt")}
                />
              </div>
              <figcaption className="mt-3 font-semibold text-white/85">{t("home.game.nightCaption")}</figcaption>
            </figure>
          </Reveal>
          <Reveal delay={0.08}>
            <figure>
              <div className="overflow-hidden rounded-2xl ring-1 ring-white/10">
                <LoopVideo
                  src="/home/game-pc.mp4"
                  poster="/home/game-pc-poster.webp"
                  width={960}
                  height={584}
                  label={t("home.game.pcAlt")}
                />
              </div>
              <figcaption className="mt-3 font-semibold text-white/85">{t("home.game.pcCaption")}</figcaption>
            </figure>
          </Reveal>
        </div>
        <p className={`${PIXEL} mt-8 text-right text-xs uppercase tracking-[0.12em] text-white/55`}>{t("home.game.realCaption")}</p>
      </div>
    </section>
  );
}
