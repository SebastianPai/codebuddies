"use client";

import { useEffect, useRef } from "react";
import { Check, Lock } from "lucide-react";

import styles from "./ChatThemePopover.module.css";
import { CHAT_BUBBLE_THEMES } from "../../hud/nameplateStyles";
import { useChatBubbleTheme } from "../../hooks/useChatBubbleTheme";
import { useTranslation } from "../../../i18n/useTranslation";

const CHAT_THEME_LIST = Object.values(CHAT_BUBBLE_THEMES);

function hexOf(color: number) {
  return `#${color.toString(16).padStart(6, "0")}`;
}

type Props = {
  x: number;
  y: number;
  onClose: () => void;
};

// Acceso directo al color de burbuja desde la misma barra donde se escribe
// el mensaje — antes esto solo vivía escondido en Ajustes, sin relación
// visual con "el mensaje que estoy por mandar".
export default function ChatThemePopover({ x, y, onClose }: Props) {
  const t = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { themeId, isPremium, saving, error, selectTheme } = useChatBubbleTheme();

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div ref={rootRef} className={styles.popover} style={{ left: x, top: y }}>
      <span className={styles.title}>{t("hud.bottomBar.chatThemeTitle")}</span>

      <div className={styles.grid}>
        {CHAT_THEME_LIST.map((theme) => {
          const locked = theme.tier === "premium" && !isPremium;
          const selected = themeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              className={`${styles.swatch} ${selected ? styles.swatchSelected : ""} ${
                locked ? styles.swatchLocked : ""
              }`}
              disabled={saving}
              onClick={() => void selectTheme(theme.id, theme.tier)}
              style={{
                background: hexOf(theme.backgroundColor),
                borderColor: hexOf(theme.borderColor),
              }}
              title={theme.label}
            >
              {locked ? (
                <Lock size={11} />
              ) : selected ? (
                <Check size={13} color={theme.nameColor} />
              ) : null}
            </button>
          );
        })}
      </div>

      {error && (
        <span className={styles.error}>
          {error === "PREMIUM_REQUIRED"
            ? t("settings.chatThemePremiumRequired")
            : t("settings.chatThemeSaveError")}
        </span>
      )}

      <div className={styles.arrow} />
    </div>
  );
}
