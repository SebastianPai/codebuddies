import React from "react";
import { Background } from "../../../types/room";
import styles from "./BackgroundSelector.module.css";
import CachedGameImage from "../../shared/CachedGameImage";

interface Props {
  backgrounds: Background[];
  selectedId?: string;
  onSelect: (id: string) => void;
  disabledMessage?: string;
}

export default function BackgroundSelector({
  backgrounds,
  selectedId,
  onSelect,
  disabledMessage = "Bloqueado",
}: Props) {
  return (
    <div className={styles.selector}>
      <label>Fondo de la sala</label>
      {!backgrounds.length && (
        <div className={styles.empty}>No hay fondos disponibles para tu cuenta.</div>
      )}
      <div className={styles.grid}>
        {backgrounds.map((bg) => (
          <button
            type="button"
            key={bg.id}
            className={`${styles.bgOption} ${selectedId === bg.id ? styles.selected : ""} ${
              bg.canUse === false ? styles.locked : ""
            }`}
            onClick={() => {
              if (bg.canUse === false) return;
              onSelect(bg.id);
            }}
            aria-disabled={bg.canUse === false}
            aria-pressed={selectedId === bg.id}
          >
            <CachedGameImage src={bg.previewUrl || bg.thumbnailUrl || bg.imageUrl} alt={bg.name} />
            <span>{bg.name}</span>
            {bg.canUse === false && (
              <small>
                {bg.lockedReason === "PREMIUM_REQUIRED"
                  ? "Premium"
                  : bg.lockedReason === "PURCHASE_REQUIRED"
                    ? `${bg.coinsPrice ?? 0} coins`
                : disabledMessage}
              </small>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
