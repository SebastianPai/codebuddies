"use client";

import { Crown, Lock, X } from "lucide-react";
import { sileo } from "sileo";
import styles from "./ColorSwatchPicker.module.css";
import { useTranslation } from "../../../i18n/useTranslation";

interface Props {
  colors: readonly number[];
  // Colores extra solo para Premium (ver packages/world-objects/palettes.ts).
  // Sin premium se ven con candado y al tocarlos se explica por qué.
  premiumColors?: readonly number[];
  isPremium?: boolean;
  value?: number | null;
  onSelect: (color: number) => void;
  // Si viene, se muestra un botón para volver al color original del sprite.
  onClear?: () => void;
  className?: string;
}

const toHex = (color: number) => "#" + color.toString(16).padStart(6, "0");

// Selector de color de equipo compartido: mismas medidas de swatch y el
// mismo indicador de "seleccionado" en cualquier lugar donde se elija un
// color (avatar, objetos de la sala, tienda, etc.) en vez de reimplementar
// el círculo a mano.
export default function ColorSwatchPicker({
  colors,
  premiumColors = [],
  isPremium = false,
  value,
  onSelect,
  onClear,
  className = "",
}: Props) {
  const t = useTranslation();

  const swatch = (color: number, locked: boolean) => {
    const hex = toHex(color);
    const selected = value === color;
    return (
      <button
        key={color}
        type="button"
        className={`${styles.swatch} ${selected ? styles.selected : ""} ${locked ? styles.locked : ""}`}
        style={{ backgroundColor: hex }}
        aria-label={t("hud.colorPicker.colorLabel", { hex })}
        aria-pressed={selected}
        onClick={() => {
          if (locked) {
            sileo.info({
              title: t("hud.colorPicker.premiumTitle"),
              description: t("hud.colorPicker.premiumMessage"),
            });
            return;
          }
          onSelect(color);
        }}
      >
        {locked && <Lock size={11} className={styles.lockIcon} />}
      </button>
    );
  };

  return (
    <div className={`${styles.wrap} ${className}`}>
      <div className={styles.row} role="group" aria-label={t("hud.colorPicker.groupLabel")}>
        {onClear && (
          <button
            type="button"
            className={`${styles.swatch} ${styles.clear} ${value == null ? styles.selected : ""}`}
            aria-label={t("hud.colorPicker.clear")}
            title={t("hud.colorPicker.clear")}
            onClick={onClear}
          >
            <X size={12} />
          </button>
        )}
        {colors.map((color) => swatch(color, false))}
      </div>

      {premiumColors.length > 0 && (
        <>
          <div className={styles.premiumLabel}>
            <Crown size={11} /> {t("hud.colorPicker.premiumLabel")}
          </div>
          <div className={styles.row} role="group" aria-label={t("hud.colorPicker.premiumLabel")}>
            {premiumColors.map((color) => swatch(color, !isPremium))}
          </div>
        </>
      )}
    </div>
  );
}
