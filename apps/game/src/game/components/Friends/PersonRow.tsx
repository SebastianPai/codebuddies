"use client";

import styles from "./PersonRow.module.css";
import UserBadges from "../shared/UserBadges";
import RarityText from "../shared/RarityText";

export type PersonRowAction = {
  label: string;
  onClick: () => void;
  tone?: "default" | "primary" | "danger" | "ghost";
  disabled?: boolean;
};

type Props = {
  username: string;
  avatarUrl?: string | null;
  nameEffectId?: string | null;
  online?: boolean;
  subtitle?: string;
  actions?: PersonRowAction[];
  onClick?: () => void;
};

export default function PersonRow({
  username,
  avatarUrl,
  nameEffectId,
  online,
  subtitle,
  actions = [],
  onClick,
}: Props) {
  return (
    <div
      className={`${styles.row} ${onClick ? styles.clickable : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className={styles.avatarWrap}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.avatar} src={avatarUrl} alt={username} />
        ) : (
          <div className={styles.avatarFallback}>{username.slice(0, 1).toUpperCase()}</div>
        )}
        {online !== undefined && (
          <div className={`${styles.onlineDot} ${online ? styles.online : ""}`} />
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.username}>
          <RarityText effect={nameEffectId}>{username}</RarityText>
          <UserBadges username={username} size={12} />
        </div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>

      {actions.length > 0 && (
        <div className={styles.actions} onClick={(event) => event.stopPropagation()}>
          {actions.map((action) => (
            <button
              key={action.label}
              className={`${styles.actionBtn} ${action.tone ? styles[action.tone] : ""}`}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
