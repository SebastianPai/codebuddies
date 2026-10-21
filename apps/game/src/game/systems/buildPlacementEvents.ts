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

// Color elegido en el panel ANTES de colocar un mueble coloreable
// (Item.colorable). Lo lee FurniturePlacementSystem al emitir
// room:item:place; null = color original del sprite. Se resetea cada vez
// que se elige otro mueble en el panel.
let placementColor: number | null = null;

export function setPlacementColor(color: number | null) {
  placementColor = color;
}

export function getPlacementColor(): number | null {
  return placementColor;
}
