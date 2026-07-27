"use client";

import { ReactNode } from "react";

import styles from "./ItemGrid.module.css";

interface Props {
  children: ReactNode;
  /** Se muestra en vez del grid cuando no hay items (reemplaza al "no pasa nada" en blanco). */
  empty?: ReactNode;
  isEmpty?: boolean;
  className?: string;
}

// Contenedor de grilla compartido por Inventory, Shop, BuildModePanel y
// AvatarInventory: mismo gap y mismas columnas responsivas, en vez de que
// cada uno defina su propio `repeat(auto-fill, minmax(...))` a mano.
export default function ItemGrid({ children, empty, isEmpty = false, className = "" }: Props) {
  if (isEmpty && empty) {
    return <div className={styles.empty}>{empty}</div>;
  }

  return <div className={`${styles.grid} ${className}`}>{children}</div>;
}
