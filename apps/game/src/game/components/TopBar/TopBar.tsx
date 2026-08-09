"use client";

import { memo, useEffect, useState } from "react";
import { Zap } from "lucide-react";
import "./TopBar.css";
import type { EnergyStatus } from "../../hooks/usePlayerStats";
import { useTranslation } from "../../../i18n/useTranslation";

type Props = {
  energy?: EnergyStatus;
};

// Solo la energía vive acá — coins/diamonds ya se muestran en la tarjeta de
// perfil del LeftSidebar (ver currency-row), así que repetirlos en una barra
// superior sería mostrar el mismo dato dos veces en pantalla. La energía en
// cambio no tenía NINGÚN lugar en la UI todavía, pese a que el backend ya la
// gasta al completar ejercicios (ver GameService.completeExercise).
function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function TopBar({ energy }: Props) {
  const t = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!energy?.nextRegenAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [energy?.nextRegenAt]);

  if (!energy) return null;

  const full = energy.current >= energy.max;
  const countdown =
    !full && energy.nextRegenAt ? formatCountdown(new Date(energy.nextRegenAt).getTime() - now) : null;

  return (
    <div className="top-bar">
      <div className="energy-pill" title={t("hud.topBar.energyHint")}>
        <Zap size={14} className="energy-icon" />
        <span className="energy-value">
          {energy.current}/{energy.max}
        </span>
        {countdown && <span className="energy-countdown">+1 {t("hud.topBar.in")} {countdown}</span>}
      </div>
    </div>
  );
}

export default memo(TopBar);
