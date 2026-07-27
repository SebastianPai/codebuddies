"use client";

export type GameDialogType = "alert" | "confirm";

export type GameDialogRequest = {
  id: string;
  type: GameDialogType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger" | "success";
};

const pendingDialogs = new Map<string, (confirmed: boolean) => void>();

function createDialogId() {
  return `dialog-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function resolveGameDialog(id: string, confirmed: boolean) {
  pendingDialogs.get(id)?.(confirmed);
  pendingDialogs.delete(id);
}

export function requestGameDialog(
  dialog: Omit<GameDialogRequest, "id">,
): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  const id = createDialogId();
  const payload: GameDialogRequest = { ...dialog, id };

  return new Promise((resolve) => {
    pendingDialogs.set(id, resolve);
    window.dispatchEvent(
      new CustomEvent<GameDialogRequest>("game:dialog", {
        detail: payload,
      }),
    );
  });
}

export function requestGameConfirm(
  dialog: Omit<GameDialogRequest, "id" | "type">,
) {
  return requestGameDialog({ ...dialog, type: "confirm" });
}

export async function showGameAlert(
  dialog: Omit<GameDialogRequest, "id" | "type" | "cancelLabel">,
) {
  await requestGameDialog({ ...dialog, type: "alert" });
}
