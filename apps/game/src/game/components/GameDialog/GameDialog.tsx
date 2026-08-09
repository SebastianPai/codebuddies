"use client";

import { useEffect, useRef } from "react";

import { GameDialogRequest } from "../../utils/dialog";
import styles from "./GameDialog.module.css";

interface Props {
  dialog: GameDialogRequest;
  onClose: (confirmed: boolean) => void;
}

export default function GameDialog({ dialog, onClose }: Props) {
  const isAlert = dialog.type === "alert";
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      // El valor no importa para alerts (showGameAlert ignora el resultado);
      // para confirms, Escape equivale a Cancelar.
      onClose(false);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  return (
    <div className={styles.backdrop} role="presentation">
      <div
        className={`${styles.dialog} ${styles[dialog.tone || "default"]}`}
        role={isAlert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="game-dialog-title"
      >
        <div className={styles.glow} />
        <div className={styles.header}>
          <span className={styles.kicker}>
            {dialog.tone === "danger" ? "Accion critica" : "CodeBuddies"}
          </span>
          <h2 id="game-dialog-title">{dialog.title}</h2>
        </div>

        <p className={styles.message}>{dialog.message}</p>

        <div className={styles.actions}>
          {!isAlert && (
            <button className={styles.secondary} onClick={() => onClose(false)}>
              {dialog.cancelLabel || "Cancelar"}
            </button>
          )}

          <button ref={primaryRef} className={styles.primary} onClick={() => onClose(true)}>
            {dialog.confirmLabel || "Aceptar"}
          </button>
        </div>
      </div>
    </div>
  );
}
