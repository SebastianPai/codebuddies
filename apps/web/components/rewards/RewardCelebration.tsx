"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Gift, Rocket, Sparkles, Trophy, X, Zap } from "lucide-react";
import { ThemeImage, THEME_IMAGE_SPRITE_KEYFRAMES } from "../ThemeImage";
import { useThemeAsset } from "../../hooks/useThemeAsset";
import { useTranslation } from "../../src/i18n/useTranslation";
import type { Celebration } from "../../contexts/RewardContext";

import { AchievementIcon, CurrencyIcon } from "@/shared/ui/currency-icon";
// Aviso de recompensa/logro: una tarjeta propia con el logo de CodeBuddies
// en vez de agrandar el navbar. Centrada arriba bajo el navbar y más grande
// que un aviso normal (en el celular, a lo ancho con margen de 16px),
// apilable, se cierra sola y la cuenta regresiva se pausa con el mouse encima.

const DURATION_MS = 5500;

export default function RewardCelebration({ items, onDismiss }: { items: Celebration[]; onDismiss: (id: string) => void }) {
  const logo = useThemeAsset("LOGO");

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-[100px] z-[120] mx-auto flex max-w-[480px] flex-col items-stretch gap-3 sm:top-[112px]"
    >
      <style>{THEME_IMAGE_SPRITE_KEYFRAMES}</style>
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <CelebrationCard key={item.id} item={item} logo={logo} onDismiss={() => onDismiss(item.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function CelebrationCard({
  item,
  logo,
  onDismiss,
}: {
  item: Celebration;
  logo: ReturnType<typeof useThemeAsset>;
  onDismiss: () => void;
}) {
  const t = useTranslation();
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DURATION_MS);
  const startedAt = useRef(0);

  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(onDismiss, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
  }, [paused, onDismiss]);

  const meta = {
    achievement: { label: t("gamification.celebration.achievement"), Icon: Trophy },
    level: { label: t("gamification.celebration.levelUp"), Icon: Rocket },
    reward: { label: t("gamification.celebration.reward"), Icon: Sparkles },
  }[item.kind] ?? { label: t("gamification.celebration.reward"), Icon: Sparkles };
  const title = item.title ?? (item.kind === "level" ? t("gamification.celebration.levelUpTitle") : t("gamification.celebration.rewardTitle"));

  return (
    <motion.article
      layout
      role="status"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
    >
      {/* Línea de acento superior con el color de marca. */}
      <div className="h-1 w-full bg-gradient-to-r from-[rgb(var(--button))] via-[rgb(var(--primary))] to-[rgb(var(--accent))]" />

      <div className="flex gap-4 p-5">
        <div className="relative shrink-0 self-start">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))]">
            <ThemeImage asset={logo} fallbackSrc="/robot-head.png" alt="CodeBuddies" size={44} className="h-11 w-11 object-contain" />
          </div>
          <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[rgb(var(--card))] bg-[rgb(var(--button))] text-[rgb(var(--button-text))]">
            {item.kind === "achievement" ? <AchievementIcon size={14} /> : <meta.Icon size={14} />}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">{meta.label}</p>
          <h3 className="mt-0.5 text-lg font-black leading-tight tracking-tight">{title}</h3>
          {item.subtitle && <p className="mt-1 line-clamp-2 text-sm text-[rgb(var(--secondary-text))]">{item.subtitle}</p>}

          {(item.xp > 0 || item.coins > 0 || (item.items?.length ?? 0) > 0) && (
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-black">
              {item.xp > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--primary)/0.14)] px-3 py-1.5 text-[rgb(var(--primary))]">
                  <Zap size={14} /> +{item.xp} XP
                </span>
              )}
              {item.coins > 0 && (
                <span className="cb-chip-coins inline-flex items-center gap-1 rounded-full px-3 py-1.5">
                  <CurrencyIcon currency="coins" size={14} /> +{item.coins}
                </span>
              )}
              {item.items?.map((label) => (
                <span key={label} className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--border)/0.7)] px-3 py-1.5">
                  <Gift size={14} /> {label}
                </span>
              ))}
            </div>
          )}

          {item.onOpen && (
            <button
              type="button"
              onClick={() => {
                item.onOpen?.();
                onDismiss();
              }}
              className="mt-3 inline-flex items-center gap-1 text-sm font-black text-[rgb(var(--primary))] hover:underline"
            >
              {item.linkLabel || t("gamification.celebration.view")} <ArrowRight size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("gamification.celebration.close")}
          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[rgb(var(--secondary-text))] transition hover:bg-[rgb(var(--border)/0.6)] hover:text-[rgb(var(--text))]"
        >
          <X size={16} />
        </button>
      </div>

      {/* Cuenta regresiva: se pausa con el mouse encima. */}
      <div className="h-0.5 w-full bg-[rgb(var(--border)/0.6)]">
        <div
          className="h-full origin-left bg-[rgb(var(--button))]"
          style={{
            animation: `cb-celebration-timer ${DURATION_MS}ms linear forwards`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      </div>
      <style>{`@keyframes cb-celebration-timer { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
    </motion.article>
  );
}
