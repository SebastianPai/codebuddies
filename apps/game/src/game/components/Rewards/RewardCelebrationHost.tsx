"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Gift, Rocket, Sparkles, Trophy, X, Zap } from "lucide-react";
import { useThemeAsset } from "../../network/themeAssets";
import { ThemeImage } from "../ThemeImage/ThemeImage";
import { getAssetsUrl } from "../../../config/env";
import { useTranslation } from "../../../i18n/useTranslation";
import { CELEBRATE_EVENT, type CelebrationInput } from "./celebrate";
import "./RewardCelebration.css";

import { AchievementIcon, CoinIcon } from "../shared/ThemeIcons";
// Aviso propio de logros/recompensas del juego, con el logo de CodeBuddies:
// reemplaza al toast genérico para todo lo que sea "ganaste algo".
// Arriba a la derecha (en pantallas chicas, a lo ancho), apilable (máx. 3),
// se cierra solo y la cuenta regresiva se pausa con el mouse encima.

const DEFAULT_LOGO_URL = `${getAssetsUrl()}/items/logo.png`;
const DURATION_MS = 5500;
const MAX_VISIBLE = 3;

type Item = CelebrationInput & { id: number };

const ICONS = { achievement: Trophy, reward: Sparkles, level: Rocket, stage: Flag } as const;

export default function RewardCelebrationHost() {
  const [items, setItems] = useState<Item[]>([]);
  const counter = useRef(0);
  const logo = useThemeAsset("LOGO");

  useEffect(() => {
    const onCelebrate = (event: Event) => {
      const detail = (event as CustomEvent<CelebrationInput>).detail;
      if (!detail) return;
      counter.current += 1;
      const item = { ...detail, id: counter.current };
      setItems((current) => [...current, item].slice(-MAX_VISIBLE));
    };
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    return () => window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
  }, []);

  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);

  return (
    <div className="cb-celebrations" aria-live="polite">
      {items.map((item) => (
        <CelebrationCard key={item.id} item={item} logo={logo} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function CelebrationCard({ item, logo, onDismiss }: { item: Item; logo: ReturnType<typeof useThemeAsset>; onDismiss: (id: number) => void }) {
  const t = useTranslation();
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const remaining = useRef(DURATION_MS);

  const close = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => onDismiss(item.id), 180);
  }, [item.id, onDismiss]);

  useEffect(() => {
    if (paused || leaving) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(close, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [paused, leaving, close]);

  const Icon = ICONS[item.kind];
  const hasRewards = (item.xp ?? 0) > 0 || (item.coins ?? 0) > 0 || (item.items?.length ?? 0) > 0;

  return (
    <article
      role="status"
      className={`cb-celebration cb-celebration-${item.kind} ${leaving ? "leaving" : ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="cb-celebration-accent" />
      <div className="cb-celebration-body">
        <div className="cb-celebration-logo">
          <ThemeImage asset={logo} fallbackSrc={DEFAULT_LOGO_URL} alt="CodeBuddies" size={34} className="cb-celebration-logo-img" />
          <span className="cb-celebration-badge">
            {item.kind === "achievement" ? <AchievementIcon size={12} /> : <Icon size={12} />}
          </span>
        </div>
        <div className="cb-celebration-text">
          <span className="cb-celebration-eyebrow">{t(`notifications.celebration.${item.kind}`)}</span>
          <b>{item.title}</b>
          {item.subtitle && <p>{item.subtitle}</p>}
          {hasRewards && (
            <div className="cb-celebration-chips">
              {(item.xp ?? 0) > 0 && (
                <span className="xp">
                  <Zap size={12} /> +{item.xp} XP
                </span>
              )}
              {(item.coins ?? 0) > 0 && (
                <span className="coins">
                  <CoinIcon size={12} /> +{item.coins}
                </span>
              )}
              {item.items?.map((label) => (
                <span key={label}>
                  <Gift size={12} /> {label}
                </span>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="cb-celebration-close" onClick={close} aria-label={t("notifications.celebration.close")}>
          <X size={15} />
        </button>
      </div>
      <div className="cb-celebration-timer">
        <i style={{ animationDuration: `${DURATION_MS}ms`, animationPlayState: paused ? "paused" : "running" }} />
      </div>
    </article>
  );
}
