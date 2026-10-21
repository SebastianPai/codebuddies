// Modo "Ver interior" (tipo Los Sims): deja ver lo que hay detrás de las
// paredes de ADELANTE sin tocar nada del mundo. Es solo visual: no mueve,
// no borra ni desapila nada (no se derrumba nada), y no toca la colisión.
//
// REGLA DE PARED: una casilla con 3 o más objetos apilados es una pared.
// Si está en la mitad de ADELANTE de la sala (la más cercana a la cámara),
// la columna ENTERA se vuelve fantasma, desde el piso hasta arriba. Lo de
// atrás (las paredes del fondo) no se toca nunca, y lo que tenga 1-2
// niveles (una mesa con una lámpara) se sigue viendo normal.
//
// Sin Phaser a propósito: lo usa RoomItemsManager y se prueba en Node.

export const INTERIOR_VIEW_EVENT = "camera:interior:changed";
const STORAGE_KEY = "interiorView";

/** Cuántos objetos apilados en una casilla la convierten en pared. */
export const WALL_STACK_MIN = 3;

/** Opacidad de una pared fantasma: casi invisible, solo un rastro de dónde está. */
export const GHOST_ALPHA = 0.02;

export type InteriorItem = {
  id: string;
  tileX: number;
  tileY: number;
  /** Suelos/paredes pintadas (texturas): nunca cuentan ni se ocultan. */
  isSurface: boolean;
};

/**
 * Ids de los objetos que van en fantasma.
 *
 * En la proyección isométrica del juego la altura en pantalla crece con
 * `x + y` (ver IsoGrid: P.y = (tx+ty)·TH/2), así que "adelante" es la
 * mitad con `x + y` mayor que la diagonal central de la sala.
 */
export function ghostedItemIds(
  items: InteriorItem[],
  roomWidth: number,
  roomHeight: number,
  wallStackMin = WALL_STACK_MIN,
): Set<string> {
  const perTile = new Map<string, string[]>();
  for (const item of items) {
    if (item.isSurface) continue;
    const key = `${item.tileX},${item.tileY}`;
    const list = perTile.get(key) ?? [];
    list.push(item.id);
    perTile.set(key, list);
  }

  const middle = (roomWidth - 1 + (roomHeight - 1)) / 2;
  const ghosted = new Set<string>();
  perTile.forEach((ids, key) => {
    if (ids.length < wallStackMin) return;
    const [x, y] = key.split(",").map(Number);
    if (x + y <= middle) return; // atrás o justo en la diagonal: se ve siempre
    ids.forEach((id) => ghosted.add(id));
  });
  return ghosted;
}

export function readInteriorView(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Guarda la preferencia y avisa a la escena (mismo patrón que camera:zoom:*). */
export function setInteriorView(enabled: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // sin storage (modo privado): igual se aplica en esta sesión
  }
  window.dispatchEvent(new CustomEvent<boolean>(INTERIOR_VIEW_EVENT, { detail: enabled }));
}
