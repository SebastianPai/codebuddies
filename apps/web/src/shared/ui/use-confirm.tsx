"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "./button";
import { Modal } from "./modal";

// QW13: reemplaza window.confirm()/alert() nativos (no themeados, bloquean
// el hilo principal, no se pueden testear) por un modal controlado. Uso:
//   const { confirm, ConfirmDialog } = useConfirm();
//   if (!(await confirm(message))) return;
//   ...renderizar {ConfirmDialog} en algún lugar del JSX.
export function useConfirm() {
  const t = useTranslation();
  const [state, setState] = useState<{
    message: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, resolve });
    });
  }, []);

  const respond = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  const ConfirmDialog = state ? (
    <Modal isOpen titleId="confirm-dialog-title" onClose={() => respond(false)}>
      <p id="confirm-dialog-title" className="text-sm text-[rgb(var(--text))]">
        {state.message}
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => respond(false)}>
          {t("common.cancel")}
        </Button>
        <Button variant="danger" onClick={() => respond(true)}>
          {t("common.delete")}
        </Button>
      </div>
    </Modal>
  ) : null;

  return { confirm, ConfirmDialog };
}
