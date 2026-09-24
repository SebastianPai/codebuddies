"use client";

import type { CSSProperties } from "react";

import hud from "../../hud/domHud.module.css";
import { resolveChatBubbleTheme } from "../../hud/nameplateStyles";
import { bubbleThemeVars, nameEffectClass } from "../../hud/hudStyleUtils";
import styles from "./CosmeticPreview.module.css";

type Props = {
  username: string;
  /** Efecto de nombre a mostrar (el del item, o el que usa el jugador). */
  effectId?: string | null;
  /** Tema de burbuja a mostrar (el del item, o el que usa el jugador). */
  bubbleThemeId?: string | null;
  message: string;
};

/**
 * "Así se vería": burbuja de chat + nombre sobre la cabeza, con las MISMAS
 * clases que el HUD del juego (hud/domHud.module.css), así lo que se compra
 * es exactamente lo que se ve después en la sala.
 */
export default function CosmeticPreview({ username, effectId, bubbleThemeId, message }: Props) {
  const theme = resolveChatBubbleTheme(bubbleThemeId ?? undefined);
  const effect = nameEffectClass(effectId);
  const initial = username.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.column}>
        <div className={`${hud.bubble} ${hud.hasFace}`} style={bubbleThemeVars(theme) as CSSProperties}>
          <span className={`${hud.face} ${styles.face}`}>{initial}</span>
          <span className={hud.text}>
            <span className={`${hud.bubbleName} ${effect}`} style={effect ? undefined : { color: theme.nameColor }}>
              {username}
            </span>
            <span className={hud.message}>{message}</span>
          </span>
          <span className={hud.tail} />
        </div>
        <div className={hud.plate}>
          <span className={effect || hud.nameDefault}>{username}</span>
        </div>
      </div>
    </div>
  );
}
