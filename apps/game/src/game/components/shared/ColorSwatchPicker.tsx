"use client";

import styles from "./ColorSwatchPicker.module.css";
import { useTranslation } from "../../../i18n/useTranslation";

interface Props {
  colors: number[];
  value?: number | null;
  onSelect: (color: number) => void;
  className?: string;
}

const toHex = (color: number) => "#" + color.toString(16).padStart(6, "0");

// Selector de color de equipo compartido: mismas medidas de swatch y el
// mismo indicador de "seleccionado" en cualquier lugar donde se elija un
// color (avatar, tienda, etc.) en vez de reimplementar el círculo a mano.
export default function ColorSwatchPicker({ colors, value, onSelect, className = "" }: Props) {
  const t = useTranslation();
  return (
    <div className={`${styles.row} ${className}`} role="group" aria-label={t("hud.colorPicker.groupLabel")}>
      {colors.map((color) => {
        const hex = toHex(color);
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            className={`${styles.swatch} ${selected ? styles.selected : ""}`}
            style={{ backgroundColor: hex }}
            aria-label={t("hud.colorPicker.colorLabel", { hex })}
            aria-pressed={selected}
            onClick={() => onSelect(color)}
          />
        );
      })}
    </div>
  );
}
