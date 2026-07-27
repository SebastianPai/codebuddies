"use client";

import { ReactNode, useId, useRef } from "react";
import Draggable from "react-draggable";

import styles from "./Modal.module.css";
import Button from "./Button";
import { useDialogBehavior } from "./useDialogBehavior";

type ZTier = "panel" | "modal" | "toast";

interface Props {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** "overlay": diálogo centrado con fondo que bloquea el juego (GameDialog, confirmaciones, etc.)
   *  "floating": panel flotante sin fondo, para ventanas que conviven con el juego (chat, notificaciones). */
  variant?: "overlay" | "floating";
  footer?: ReactNode;
  headerActions?: ReactNode;
  zTier?: ZTier;
  closeLabel?: string;
  className?: string;
  contentClassName?: string;
  /** Overrides puntuales (ancho, alto, etc.) sin pelear con la especificidad de CSS Modules. */
  style?: React.CSSProperties;
  /** Arrastrar desde el header. Por defecto activado solo en variant="floating". */
  draggable?: boolean;
}

// Ventana/diálogo compartido: un solo lugar que resuelve backdrop, botón de
// cerrar, cierre con Escape, z-index por capa y foco atrapado dentro del
// modal — en vez de que cada ventana del juego reimplemente todo esto por su
// cuenta (que es lo que había: 6 z-index distintos y 6 formas de cerrar).
export default function Modal({
  title,
  onClose,
  children,
  variant = "overlay",
  footer,
  headerActions,
  zTier = "modal",
  closeLabel = "Cerrar",
  className = "",
  contentClassName = "",
  style,
  draggable = variant === "floating",
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useDialogBehavior(dialogRef, onClose);

  let dialog = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={`${styles.dialog} ${styles[variant]} ${className}`}
      style={{ zIndex: `var(--cb-z-${zTier})`, ...style }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={styles.header}>
        <span id={titleId} className={styles.title}>
          {title}
        </span>
        <div className={styles.headerActions}>
          {headerActions}
          <Button variant="ghost" size="sm" aria-label={closeLabel} onClick={onClose} className={styles.closeBtn}>
            ✕
          </Button>
        </div>
      </div>

      <div className={`${styles.content} ${contentClassName}`}>{children}</div>

      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );

  if (draggable) {
    dialog = (
      <Draggable nodeRef={dialogRef} handle={`.${styles.header}`}>
        {dialog}
      </Draggable>
    );
  }

  if (variant === "floating") {
    // Capa fija que solo sirve para centrar la posición inicial del panel
    // (flexbox, no transform: así no pelea con el translate() que aplica
    // react-draggable al moverlo). El resto de la pantalla sigue siendo
    // interactivo porque la capa no captura clicks, solo el panel.
    return (
      <div className={styles.floatingLayer} style={{ zIndex: `var(--cb-z-${zTier})` }}>
        {dialog}
      </div>
    );
  }

  return (
    <div className={styles.backdrop} style={{ zIndex: `var(--cb-z-${zTier})` }} onClick={onClose}>
      {dialog}
    </div>
  );
}
