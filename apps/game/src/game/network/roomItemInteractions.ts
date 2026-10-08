/**
 * ÚNICA ruta por la que el cliente pide interactuar con un objeto de la sala.
 *
 * La usan las dos entradas que existen:
 *   · el click izquierdo directo sobre el sprite (RoomItemsManager)
 *   · los botones del menú contextual (FurnitureContextMenu)
 *
 * Tener una sola función es lo que garantiza que las dos manden exactamente el
 * mismo evento con el mismo payload, y que mañana un cambio en el protocolo se
 * haga en un sitio. Antes el menú armaba el `socket.emit` a mano; si el click
 * físico hubiera armado el suyo, tendríamos dos formatos que se desincronizan.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EL CLIENTE NO MANDA ESTADO
 *
 * El payload es sólo "qué objeto" y "qué interacción". Nunca viaja el estado
 * destino, ni la animación, ni el behavior: eso lo decide el servidor, que es
 * la única autoridad. Mandar `{ to: "ON" }` desde acá permitiría a un cliente
 * modificado poner cualquier objeto en cualquier estado.
 */

/** Interacciones que el servidor acepta hoy (enum InteractionType). */
export type RoomItemInteraction =
  | "CLICK"
  | "TOGGLE"
  | "OPEN"
  | "SIT"
  | "LIE"
  | "DRINK"
  | "TELEPORT";

/** Payload exacto que viaja por el socket. Nada más que esto. */
export type RoomItemInteractPayload = {
  roomItemId: string;
  interaction: RoomItemInteraction;
};

function resolveSocket(): { emit: (event: string, payload: unknown) => void } | null {
  if (typeof window === "undefined") return null;
  return (window as any).phaserSocket ?? null;
}

/**
 * Pide al servidor una interacción. Devuelve si la petición llegó a salir.
 *
 * No cambia NADA en pantalla: no hay actualización optimista. El objeto sólo
 * se mueve cuando vuelve `room:item:state`, que es lo que hace que todos los
 * jugadores de la sala vean la misma transición y no cada uno la suya.
 */
export function emitRoomItemInteraction(
  roomItemId: string,
  interaction: RoomItemInteraction,
): boolean {
  const socket = resolveSocket();
  if (!socket || !roomItemId) return false;

  const payload: RoomItemInteractPayload = { roomItemId, interaction };
  socket.emit("room:item:interact", payload);
  return true;
}
