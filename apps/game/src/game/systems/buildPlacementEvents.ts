// Sin dependencias de Phaser a propósito: lo importan tanto BuildSystem
// (escena) como BuildModePanel (React).

// Detalle: { itemId: string | null, remaining: number }. remaining = 0 con
// itemId null significa que la colocación terminó (sin stock, ESC, cancelar).
export const BUILD_PLACEMENT_PROGRESS_EVENT = "build:placement:progress";

export type BuildPlacementProgress = { itemId: string | null; remaining: number };

export function emitPlacementProgress(itemId: string | null | undefined, remaining: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<BuildPlacementProgress>(BUILD_PLACEMENT_PROGRESS_EVENT, {
      detail: { itemId: itemId ?? null, remaining },
    }),
  );
}
