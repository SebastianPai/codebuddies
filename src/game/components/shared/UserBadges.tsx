"use client";

import { Award, BadgeCheck } from "lucide-react";
import { useBadgeConfig, useUserBadges } from "../../hooks/useUserBadges";
import styles from "./UserBadges.module.css";

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

// Insignias de verificado/creador junto al nombre de un usuario: se usa en
// cualquier lugar del juego donde aparece un username (chat, amigos, perfil,
// dueño de sala...) en vez de repetir la lógica de ícono default-vs-imagen-
// admin en cada componente.
export default function UserBadges({ username, verified, isCreator, size = 14, className = "" }: Props) {
  const fetched = useUserBadges(verified === undefined || isCreator === undefined ? username : null);
  const config = useBadgeConfig();

  const isVerified = verified ?? fetched.verified;
  const hasCreator = isCreator ?? fetched.isCreator;

  if (!isVerified && !hasCreator) return null;

  const verifiedIcon = config?.VERIFIED.iconUrl ?? null;
  const creatorIcon = config?.CREATOR.iconUrl ?? null;

  return (
    <span className={`${styles.badges} ${className}`}>
      {isVerified &&
        (verifiedIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={verifiedIcon} alt="Verificado" title="Verificado" width={size} height={size} className={styles.icon} />
        ) : (
          <BadgeCheck size={size} color={VERIFIED_COLOR} aria-label="Verificado" />
        ))}
      {hasCreator &&
        (creatorIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creatorIcon} alt="Creador" title="Creador" width={size} height={size} className={styles.icon} />
        ) : (
          <Award size={size} color={CREATOR_COLOR} aria-label="Creador" />
        ))}
    </span>
  );
}
