"use client";

import { Award, BadgeCheck, type LucideIcon } from "lucide-react";
import { useBadgeConfig, useSpriteFrameAspect, useUserBadges } from "../../hooks/useUserBadges";
import type { BadgeIconConfig } from "../../network/badges";
import styles from "./UserBadges.module.css";
import { useTranslation } from "../../../i18n/useTranslation";

interface Props {
  /** Si no se pasan `verified`/`isCreator` explícitos, los resuelve solo por username (con caché). */
  username?: string | null;
  verified?: boolean;
  isCreator?: boolean;
  size?: number;
  className?: string;
}

const VERIFIED_COLOR = "#3b82f6";
const CREATOR_COLOR = "#facc15";

const DEFAULT_ICON_CONFIG: BadgeIconConfig = {
  iconUrl: null,
  mode: "STATIC",
  size: 16,
  frameCount: 6,
  direction: "PINGPONG",
  frameRate: 10,
};

// Insignias de verificado/creador junto al nombre de un usuario: se usa en
// cualquier lugar del juego donde aparece un username (chat, amigos, perfil,
// dueño de sala...) en vez de repetir la lógica de ícono default-vs-imagen-
// admin en cada componente.
export default function UserBadges({ username, verified, isCreator, size = 14, className = "" }: Props) {
  const t = useTranslation();
  const fetched = useUserBadges(verified === undefined || isCreator === undefined ? username : null);
  const config = useBadgeConfig();

  const isVerified = verified ?? fetched.verified;
  const hasCreator = isCreator ?? fetched.isCreator;

  if (!isVerified && !hasCreator) return null;

  return (
    <span className={`${styles.badges} ${className}`}>
      {isVerified && (
        <BadgeIcon
          config={config?.VERIFIED ?? DEFAULT_ICON_CONFIG}
          size={size}
          DefaultIcon={BadgeCheck}
          color={VERIFIED_COLOR}
          label={t("hud.badges.verified")}
        />
      )}
      {hasCreator && (
        <BadgeIcon
          config={config?.CREATOR ?? DEFAULT_ICON_CONFIG}
          size={size}
          DefaultIcon={Award}
          color={CREATOR_COLOR}
          label={t("hud.badges.creator")}
        />
      )}
    </span>
  );
}

function BadgeIcon({
  config,
  size,
  DefaultIcon,
  color,
  label,
}: {
  config: BadgeIconConfig;
  size: number;
  DefaultIcon: LucideIcon;
  color: string;
  label: string;
}) {
  if (!config.iconUrl) {
    return <DefaultIcon size={size} color={color} aria-label={label} />;
  }

  // Con ícono propio, el tamaño lo controla el admin (config.size) — el
  // `size` prop del sitio de uso solo aplica al ícono lucide por defecto.
  const iconSize = config.size;

  if (config.mode === "SPRITE") {
    return <SpriteBadgeIcon config={config} size={iconSize} label={label} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={config.iconUrl} alt={label} title={label} width={iconSize} height={iconSize} className={styles.icon} />
  );
}

function SpriteBadgeIcon({ config, size, label }: { config: BadgeIconConfig; size: number; label: string }) {
  // Un frame no siempre es cuadrado (frameWidth = anchoTotal/frameCount) —
  // sin esto, forzar width=height=size aplastaba el sprite verticalmente.
  // Se mantiene el alto fijo (para alinear con los demás íconos) y el ancho
  // sigue la proporción real del frame.
  const aspect = useSpriteFrameAspect(config.iconUrl, config.frameCount);
  const steps = Math.max(1, config.frameCount - 1);
  const duration = config.frameCount / Math.max(1, config.frameRate);

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`${styles.icon} ${styles.spriteIcon}`}
      style={{
        width: size * aspect,
        height: size,
        backgroundImage: `url(${config.iconUrl})`,
        backgroundSize: `${config.frameCount * 100}% 100%`,
        animationDuration: `${duration}s`,
        animationTimingFunction: `steps(${steps})`,
        animationDirection: config.direction === "PINGPONG" ? "alternate" : "normal",
      }}
    />
  );
}
