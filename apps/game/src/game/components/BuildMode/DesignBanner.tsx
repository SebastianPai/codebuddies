"use client";

import { Sparkles } from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";
import styles from "./DesignBanner.module.css";

// Aviso fuera del modo construcción cuando se está en la sala de diseño: que
// quede claro que es una prueba privada y cómo seguir o volver.
interface Props {
  onKeepDesigning: () => void;
  onApply: () => void;
  onLeave: () => void;
}

export default function DesignBanner({ onKeepDesigning, onApply, onLeave }: Props) {
  const t = useTranslation();
  return (
    <div className={styles.banner} role="status">
      <Sparkles size={16} className={styles.icon} />
      <span className={styles.text}>
        <b>{t("buildmode.designBannerTitle")}</b>
        <span>{t("buildmode.designBannerText")}</span>
      </span>
      <button type="button" onClick={onKeepDesigning}>
        {t("buildmode.designKeepDesigning")}
      </button>
      <button type="button" className={styles.primary} onClick={onApply}>
        {t("buildmode.designMakeReal")}
      </button>
      <button type="button" onClick={onLeave}>
        {t("buildmode.designLeave")}
      </button>
    </div>
  );
}
