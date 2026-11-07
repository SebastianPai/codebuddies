"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
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
  /** Acciones secundarias (ver perfil, eliminar, bloquear) en un menú "más opciones". */
  menu?: PersonRowAction[];
  menuLabel?: string;
  onClick?: () => void;
};

export default function PersonRow({
  username,
  avatarUrl,
  nameEffectId,
  online,
  subtitle,
  actions = [],
  menu = [],
  menuLabel = "...",
  onClick,
}: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
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

      {(actions.length > 0 || menu.length > 0) && (
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
          {menu.length > 0 && (
            <div className={styles.menuWrap} ref={menuRef}>
              <button
                className={`${styles.actionBtn} ${styles.ghost} ${styles.moreBtn}`}
                aria-label={menuLabel}
                title={menuLabel}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                <MoreHorizontal size={16} />
              </button>
              {open && (
                <div className={styles.menu} role="menu">
                  {menu.map((item) => (
                    <button
                      key={item.label}
                      role="menuitem"
                      className={`${styles.menuItem} ${item.tone === "danger" ? styles.menuDanger : ""}`}
                      disabled={item.disabled}
                      onClick={() => { setOpen(false); item.onClick(); }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
