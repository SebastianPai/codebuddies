"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Award, CalendarCheck, Target } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { CONTAINER, Eyebrow, Reveal, SectionTitle } from "./ui";

const TABS = [
  { key: "missions", icon: Target, src: "/home/progress-missions.webp", width: 1215, height: 295 },
  { key: "pass", icon: CalendarCheck, src: "/home/progress-pass.webp", width: 1215, height: 520 },
  { key: "achievements", icon: Award, src: "/home/progress-achievements.webp", width: 1166, height: 400 },
] as const;

// Gamificación con capturas reales de /missions, /battle-pass y /achievements.
// Pestañas accesibles (flechas) que además avanzan solas cada AUTO_MS mientras
// la sección se ve, con una barrita de tiempo: movimiento sin sumar peso. Se
// detienen para siempre si la persona elige una pestaña, y mientras el mouse
// o el foco están encima. Con "reducir movimiento" no avanzan.
const AUTO_MS = 6000;

export function HomeProgress() {
  const t = useTranslation();
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tab = TABS[active];
  const sectionRef = useRef<HTMLElement>(null);
  const [userChose, setUserChose] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [inView, setInView] = useState(false);
  // inView ya viene en falso si el sistema pide reducir movimiento.
  const autoplay = !userChose && !hovering && inView;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && !reduced.matches),
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % TABS.length), AUTO_MS);
    return () => window.clearTimeout(timer);
  }, [autoplay, active]);

  const choose = (index: number) => {
    setUserChose(true);
    setActive(index);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = (active + step + TABS.length) % TABS.length;
    choose(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      ref={sectionRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      className="border-t border-[rgb(var(--border)/0.5)] py-20 sm:py-28"
    >
      <style>{`@keyframes home-tab-timer { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
      <div className={`${CONTAINER} grid gap-12 lg:grid-cols-12 lg:gap-14`}>
        <Reveal className="lg:col-span-4">
          <Eyebrow>{t("home.progress.eyebrow")}</Eyebrow>
          <SectionTitle>{t("home.progress.title")}</SectionTitle>
          <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--secondary-text))]">{t("home.progress.text")}</p>

          <div role="tablist" aria-orientation="vertical" onKeyDown={onKeyDown} className="mt-8 space-y-2">
            {TABS.map(({ key, icon: Icon }, index) => {
              const selected = index === active;
              return (
                <button
                  key={key}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  id={`${baseId}-tab-${key}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => choose(index)}
                  className={`relative flex w-full gap-4 overflow-hidden rounded-2xl p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[rgb(var(--primary))] ${
                    selected ? "bg-[rgb(var(--card))] ring-1 ring-[rgb(var(--border)/0.8)]" : "hover:bg-[rgb(var(--card)/0.5)]"
                  }`}
                >
                  <Icon
                    size={22}
                    aria-hidden="true"
                    className={`mt-0.5 shrink-0 ${selected ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--secondary-text))]"}`}
                  />
                  <span>
                    <span className="block font-bold">{t(`home.progress.tabs.${key}.label`)}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-[rgb(var(--secondary-text))]">
                      {t(`home.progress.tabs.${key}.text`)}
                    </span>
                  </span>
                  {selected && autoplay && (
                    <span
                      key={active}
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[rgb(var(--primary))]"
                      style={{ animation: `home-tab-timer ${AUTO_MS}ms linear forwards` }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-8 text-[rgb(var(--secondary-text))]">{t("home.progress.more")}</p>
          <Link href="/rankings" className="mt-3 inline-flex items-center gap-2 font-bold text-[rgb(var(--primary))]">
            {t("home.progress.rankings")} <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-8 lg:pt-56">
          <div
            id={`${baseId}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${tab.key}`}
            className="relative overflow-hidden rounded-3xl bg-[#0c0e12] p-3 ring-1 ring-white/10 sm:p-5"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <Image
                  src={tab.src}
                  alt={t(`home.progress.tabs.${tab.key}.alt`)}
                  width={tab.width}
                  height={tab.height}
                  sizes="(min-width: 1024px) 800px, 100vw"
                  className="h-auto w-full rounded-xl"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
