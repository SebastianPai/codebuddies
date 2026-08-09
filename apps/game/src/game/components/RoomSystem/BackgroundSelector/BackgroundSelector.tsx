import React from "react";
import { Background } from "../../../types/room";
import styles from "./BackgroundSelector.module.css";
import CachedGameImage from "../../shared/CachedGameImage";
import { useTranslation } from "../../../../i18n/useTranslation";

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
  disabledMessage,
}: Props) {
  const t = useTranslation();
  const resolvedDisabledMessage = disabledMessage ?? t("rooms.backgroundLocked");

  return (
    <div className={styles.selector}>
      <label>{t("rooms.backgroundSelectorLabel")}</label>
      {!backgrounds.length && (
        <div className={styles.empty}>{t("rooms.backgroundSelectorEmpty")}</div>
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
                  ? t("rooms.backgroundPremium")
                  : bg.lockedReason === "PURCHASE_REQUIRED"
                    ? t("rooms.backgroundCoinsPrice", { price: bg.coinsPrice ?? 0 })
                : resolvedDisabledMessage}
              </small>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
