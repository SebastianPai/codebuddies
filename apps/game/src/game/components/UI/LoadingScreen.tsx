"use client";

import { useEffect, useState } from "react";
import { ThemeImage } from "../ThemeImage/ThemeImage";
import { useThemeAsset } from "../../network/themeAssets";
import { getAssetsUrl } from "../../../config/env";
import { useTranslation } from "../../../i18n/useTranslation";
import styles from "./LoadingScreen.module.css";

// Pantalla de carga: al abrir el juego y al entrar a una sala. Logo, qué se
// está cargando, una barra que avanza sola (no hay progreso real que medir:
// es para que se note que algo pasa) y consejos que van cambiando.
const DEFAULT_LOGO_URL = `${getAssetsUrl()}/items/logo.png`;
const TIP_COUNT = 8;
const TIP_EVERY_MS = 3500;

interface Props {
  title: string;
  subtitle?: string;
  /** Fondo transparente oscuro (cambio de sala) en vez de negro total. */
  overlay?: boolean;
}

export default function LoadingScreen({ title, subtitle, overlay = false }: Props) {
  const t = useTranslation();
  const logoAsset = useThemeAsset("LOGO");
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIP_COUNT));

  useEffect(() => {
    const id = setInterval(() => setTip((current) => (current + 1) % TIP_COUNT), TIP_EVERY_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`${styles.screen} ${overlay ? styles.overlay : ""}`} role="status" aria-live="polite">
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          {/* Logo del admin (tema); mientras no llega, o si no hay, las iniciales. */}
          {logoAsset ? (
            <ThemeImage asset={logoAsset} fallbackSrc={DEFAULT_LOGO_URL} alt="CodeBuddies" size={72} className={styles.logo} />
          ) : (
            <span className={styles.logoFallback} aria-hidden="true">CB</span>
          )}
        </div>
        <div className={styles.brand}>
          <span className={styles.brandCode}>CODE</span>
          <span className={styles.brandBuddies}>BUDDIES</span>
        </div>
        <p className={styles.title}>{title}</p>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        <div className={styles.bar} aria-hidden="true">
          <span className={styles.barFill} />
        </div>
        <p key={tip} className={styles.tip}>
          <b>{t("hud.loading.tipLabel")}</b> {t(`hud.loading.tip${tip + 1}`)}
        </p>
      </div>
    </div>
  );
}
