"use client";

import { Flag, Zap } from "lucide-react";
import { useEffect } from "react";
import { money } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

// Subir de etapa es el gran momento del juego (y el clip que se comparte):
// cubre CodeStudio con confeti y el nombre de la etapa nueva en grande. Se
// cierra solo o con un clic. El aviso chico de RewardCelebrationHost sigue
// saliendo igual; esto es solo la parte visual.

export type StageUp = {
  index: number;
  name: string;
  tagline: string;
  reward: { cash: number; xp: number; coins: number } | null;
};

const DURATION_MS = 4200;
const CONFETTI_COLORS = ["#facc15", "#0a84ff", "#30d158", "#ff453a", "#bf5af2", "#64d2ff"];
// Posiciones fijas (no Math.random en render): mismo confeti en cada render.
const CONFETTI = Array.from({ length: 36 }, (_, index) => ({
  left: (index * 37) % 100,
  delay: ((index * 13) % 10) / 10,
  duration: 2.2 + ((index * 7) % 10) / 8,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  rotate: (index * 47) % 360,
}));

export default function StageUpOverlay({ stage, onClose }: { stage: StageUp; onClose: () => void }) {
  const t = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onClose, DURATION_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="cs2-stageup" role="status" onClick={onClose}>
      <div className="cs2-stageup-confetti" aria-hidden="true">
        {CONFETTI.map((piece, index) => (
          <i
            key={index}
            style={{
              left: `${piece.left}%`,
              background: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              transform: `rotate(${piece.rotate}deg)`,
            }}
          />
        ))}
      </div>
      <div className="cs2-stageup-card">
        <span className="cs2-stageup-eyebrow">
          <Flag size={16} /> {t("codestudio.stageUp.title")}
        </span>
        <b className="cs2-stageup-index">{stage.index + 1}</b>
        <h2>{stage.name}</h2>
        {stage.tagline && <p>{stage.tagline}</p>}
        {stage.reward && (
          <div className="cs2-stageup-chips">
            {stage.reward.cash > 0 && <span>+{money(stage.reward.cash)}</span>}
            {stage.reward.xp > 0 && (
              <span>
                <Zap size={14} /> +{stage.reward.xp} XP
              </span>
            )}
            {stage.reward.coins > 0 && <span>+{t("codestudio.common.coins", { count: stage.reward.coins })}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
