"use client";

import { ReactNode } from "react";

import styles from "./ItemCard.module.css";
import ItemPreview from "../UI/ItemPreview";

interface Props {
  item: any;
  title?: string;
  /** Insignia de cantidad, ej. "x3". */
  stackCount?: number;
  selected?: boolean;
  locked?: boolean;
  /** Zona libre para precio/botón de equipar/etc., propia de cada dominio (tienda, inventario, avatar...). */
  footer?: ReactNode;
  onClick?: () => void;
  className?: string;
}

// Celda de item compartida por Inventory, Shop, BuildModePanel y
// AvatarInventory: mismo tamaño de imagen, mismo radio, misma insignia de
// stack y mismo estado "bloqueado", con un slot libre para las acciones
// propias de cada tienda/inventario en vez de duplicar la tarjeta entera.
//
// El "footer" se renderiza fuera del área clickeable: ahí van botones reales
// (Comprar, Equipar...) y anidar un <button> dentro de otro no es válido HTML.
export default function ItemCard({ item, title, stackCount, selected, locked, footer, onClick, className = "" }: Props) {
  const label = title ?? item?.name ?? "Item";
  const classes = [styles.card, selected ? styles.selected : "", locked ? styles.locked : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <button
        type="button"
        className={styles.hitArea}
        onClick={onClick}
        disabled={locked || !onClick}
        aria-pressed={onClick ? !!selected : undefined}
      >
        <div className={styles.previewFrame}>
          <ItemPreview item={item} alt={label} className={styles.preview} />
          {!!stackCount && stackCount > 1 && <span className={styles.stack}>x{stackCount}</span>}
          {locked && (
            <span className={styles.lockIcon} aria-hidden="true">
              🔒
            </span>
          )}
        </div>
        <span className={styles.title} title={label}>
          {label}
        </span>
      </button>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
