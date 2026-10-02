"use client";

import { useEffect } from "react";
import { sileo } from "sileo";
import { Flag, Gift, Rocket, Sparkles, Zap } from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";
import { CELEBRATE_EVENT, type CelebrationInput } from "./celebrate";
import { AchievementIcon, CoinIcon } from "../shared/ThemeIcons";
import "./RewardCelebration.css";

// Aviso de logros/recompensas del juego con el mismo sistema de avisos
// (sileo), centrado arriba y más grande que los avisos normales: es el
// momento de "ganaste algo". Cualquier parte del juego lo dispara con
// celebrate({...}) (ver celebrate.ts).

const DURATION_MS = 5500;
const ICONS = { reward: Sparkles, level: Rocket, stage: Flag } as const;

export default function RewardCelebrationHost() {
  const t = useTranslation();

  useEffect(() => {
    const onCelebrate = (event: Event) => {
      const item = (event as CustomEvent<CelebrationInput>).detail;
      if (!item) return;
      const Icon = item.kind === "achievement" ? null : ICONS[item.kind];
      const hasRewards = (item.xp ?? 0) > 0 || (item.coins ?? 0) > 0 || (item.items?.length ?? 0) > 0;
      sileo.success({
        title: item.title,
        icon: Icon ? <Icon size={18} /> : <AchievementIcon size={18} />,
        position: "top-center",
        duration: DURATION_MS,
        autopilot: { expand: 150, collapse: DURATION_MS - 900 },
        description: (
          <span className="cb-celebration-body">
            <span className="cb-celebration-kicker">{t(`notifications.celebration.${item.kind}`)}</span>
            {item.subtitle && <span className="cb-celebration-subtitle">{item.subtitle}</span>}
            {hasRewards && (
              <span className="cb-celebration-chips">
                {(item.xp ?? 0) > 0 && (
                  <span className="cb-celebration-chip xp">
                    <Zap size={14} /> +{item.xp} XP
                  </span>
                )}
                {(item.coins ?? 0) > 0 && (
                  <span className="cb-celebration-chip coins">
                    <CoinIcon size={14} /> +{item.coins}
                  </span>
                )}
                {item.items?.map((label) => (
                  <span key={label} className="cb-celebration-chip">
                    <Gift size={14} /> {label}
                  </span>
                ))}
              </span>
            )}
          </span>
        ),
      });
    };
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    return () => window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
  }, [t]);

  return null;
}
