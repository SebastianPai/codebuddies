"use client";

import { useCallback } from "react";
import { sileo } from "sileo";
import { Gift, Rocket, Sparkles, Zap } from "lucide-react";
import { useTranslation } from "../../src/i18n/useTranslation";
import { AchievementIcon, CurrencyIcon } from "@/shared/ui/currency-icon";
import type { Celebration } from "../../contexts/RewardContext";

// Aviso de recompensa/logro con el mismo sistema de avisos del juego
// (sileo), centrado arriba y más grande que los avisos normales (ver
// .cb-celebration-toast en globals.css). Reemplaza la tarjeta lateral.

const DURATION_MS = 5500;

export function useCelebrationToast() {
  const t = useTranslation();

  return useCallback(
    (item: Omit<Celebration, "id">) => {
      const label =
        item.kind === "achievement"
          ? t("gamification.celebration.achievement")
          : item.kind === "level"
            ? t("gamification.celebration.levelUp")
            : t("gamification.celebration.reward");
      const title =
        item.title ?? (item.kind === "level" ? t("gamification.celebration.levelUpTitle") : t("gamification.celebration.rewardTitle"));
      const icon =
        item.kind === "achievement" ? <AchievementIcon size={18} /> : item.kind === "level" ? <Rocket size={18} /> : <Sparkles size={18} />;

      sileo.success({
        title,
        icon,
        position: "top-center",
        duration: DURATION_MS,
        autopilot: { expand: 150, collapse: DURATION_MS - 900 },
        styles: { title: "cb-celebration-title", description: "cb-celebration-description" },
        description: (
          <span className="cb-celebration-body">
            <span className="cb-celebration-kicker">{label}</span>
            {item.subtitle && <span className="cb-celebration-subtitle">{item.subtitle}</span>}
            {(item.xp > 0 || item.coins > 0 || (item.items?.length ?? 0) > 0) && (
              <span className="cb-celebration-chips">
                {item.xp > 0 && (
                  <span className="cb-celebration-chip cb-celebration-chip-xp">
                    <Zap size={14} /> +{item.xp} XP
                  </span>
                )}
                {item.coins > 0 && (
                  <span className="cb-celebration-chip cb-celebration-chip-coins">
                    <CurrencyIcon currency="coins" size={14} /> +{item.coins}
                  </span>
                )}
                {item.items?.map((name) => (
                  <span key={name} className="cb-celebration-chip">
                    <Gift size={14} /> {name}
                  </span>
                ))}
              </span>
            )}
          </span>
        ),
        button: item.onOpen ? { title: item.linkLabel || t("gamification.celebration.view"), onClick: item.onOpen } : undefined,
      });
    },
    [t],
  );
}
