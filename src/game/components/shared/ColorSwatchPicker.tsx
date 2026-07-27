"use client";

import styles from "./ColorSwatchPicker.module.css";

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
  return (
    <div className={`${styles.row} ${className}`} role="group" aria-label="Elegir color">
      {colors.map((color) => {
        const hex = toHex(color);
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            className={`${styles.swatch} ${selected ? styles.selected : ""}`}
            style={{ backgroundColor: hex }}
            aria-label={`Color ${hex}`}
            aria-pressed={selected}
            onClick={() => onSelect(color)}
          />
        );
      })}
    </div>
  );
}
