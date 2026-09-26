import path from "path";
import { API_URL } from "./fixtures";

/**
 * Cliente Socket.IO real contra `GameGateway`, para PARTES 18–26.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ SOCKETS Y NO EL CANVAS DE PHASER
 *
 * "Click → transición → animación → estado final", el multiplayer, el late
 * join, el refresh y el click-spam son, en su esencia, un protocolo:
 * qué manda el cliente, qué decide el servidor y qué difunde a la sala. Eso
 * es exactamente lo que expone `room:item:interact` / `room:item:state`
 * (`room-items.handler.ts`). Leerlo directamente es una verificación MÁS
 * fuerte que interpretar píxeles de un `<canvas>` — ahí no hay manera de leer
 * "state", "via" o "at" sin asumir cómo los dibuja el animator.
 *
 * La verificación VISUAL (que el sprite se vea, que tenga el tamaño y la
 * orientación correctos) se hace aparte, con el navegador de verdad, en
 * `e2e/06-game-visual.spec.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ES EL MISMO SERVIDOR, EL MISMO PROTOCOLO, LA MISMA AUTENTICACIÓN
 *
 * Se conecta con `socket.io-client` (dependencia real de `apps/game`, no una
 * reimplementación) al `GameGateway` real, autenticado con el MISMO JWT que
 * usa el navegador (`socket.handshake.auth.token`, ver
 * `player.handler.ts#handleConnection`). No hay ningún atajo de test en el
 * servidor: si el gateway cambia, este arnés se rompe con él.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { io } = require(
  require.resolve("socket.io-client", { paths: [path.join(__dirname, "..", "apps", "game")] }),
) as typeof import("socket.io-client");

export type GameSocket = ReturnType<typeof io>;

export function connectGameSocket(token: string): GameSocket {
  return io(API_URL, {
    auth: { token },
    transports: ["websocket"],
    forceNew: true,
  });
}

export function waitForConnect(socket: GameSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("timeout conectando el socket")), 15_000);
    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once("connect_error", (error: Error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/** Espera UN evento, con timeout. Devuelve su payload. */
export function waitForEvent<T = unknown>(
  socket: GameSocket,
  event: string,
  timeoutMs = 10_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`timeout esperando "${event}"`)),
      timeoutMs,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

/** Acumula TODOS los eventos de un tipo hasta que se llame `stop()`. */
export function collectEvents<T = unknown>(
  socket: GameSocket,
  event: string,
): { events: T[]; stop(): void } {
  const events: T[] = [];
  const handler = (payload: T) => events.push(payload);
  socket.on(event, handler);
  return { events, stop: () => socket.off(event, handler) };
}

export type CreatedRoom = { id: string; name: string };

export async function createRoom(
  socket: GameSocket,
  name: string,
  layoutId?: string,
): Promise<CreatedRoom> {
  const created = waitForEvent<CreatedRoom>(socket, "room:created");
  const failed = waitForEvent<{ message: string }>(socket, "room:error");
  // El modal real de creación exige elegir un layout (`RoomCreateModal`); el
  // servicio lo acepta como opcional, pero SIN uno el cliente no tiene qué
  // tilemap dibujar ("❌ Sala sin layout" en consola, canvas negro). Para
  // pruebas que sólo verifican el PROTOCOLO (clicks/multiplayer/late-join)
  // eso no importa; para pruebas VISUALES hay que pasar un layout real.
  socket.emit("createRoom", { name, isPublic: true, ...(layoutId && { layoutId }) });

  const result = await Promise.race([
    created.then((room) => ({ ok: true as const, room })),
    failed.then((error) => ({ ok: false as const, error })),
  ]);

  if (!result.ok) throw new Error(`No se pudo crear la sala: ${result.error.message}`);
  return result.room;
}

export async function joinRoom(socket: GameSocket, roomId: string): Promise<void> {
  const joined = waitForEvent(socket, "room:joined");
  const failed = waitForEvent<{ message?: string; reason?: string }>(socket, "room:join:error");
  socket.emit("joinRoom", { roomId });

  const result = await Promise.race([
    joined.then(() => ({ ok: true as const })),
    failed.then((error) => ({ ok: false as const, error })),
  ]);

  if (!result.ok) {
    throw new Error(`No se pudo entrar a la sala: ${result.error.message ?? result.error.reason}`);
  }
}

export type PlacedRoomItem = { id: string; roomId: string; itemId: string; state: unknown };

export async function placeItem(
  socket: GameSocket,
  roomId: string,
  itemId: string,
  x = 3,
  y = 3,
): Promise<PlacedRoomItem> {
  const placed = waitForEvent<PlacedRoomItem>(socket, "room:item:placed");
  const failed = waitForEvent<{ message: string }>(socket, "room:item:error");
  socket.emit("room:item:place", { roomId, itemId, x, y, rotation: 0 });

  const result = await Promise.race([
    placed.then((item) => ({ ok: true as const, item })),
    failed.then((error) => ({ ok: false as const, error })),
  ]);

  if (!result.ok) throw new Error(`No se pudo colocar el item: ${result.error.message}`);
  return result.item;
}

/**
 * Reposiciona un RoomItem ya colocado. Mismo evento real que usa Build Mode
 * al arrastrar un mueble (`room:item:move` → `RoomItemsHandler#moveItem`).
 *
 * Se usa en la Fase 11.5-B como herramienta de SETUP para ubicar el punto de
 * click — nunca como sustituto del click en sí, que sigue siendo
 * `page.mouse.click()` sobre el canvas real.
 */
export async function moveItem(
  socket: GameSocket,
  roomItemId: string,
  x: number,
  y: number,
  rotation = 0,
): Promise<PlacedRoomItem> {
  const moved = waitForEvent<PlacedRoomItem>(socket, "room:item:moved");
  const failed = waitForEvent<{ message: string }>(socket, "room:item:error");
  socket.emit("room:item:move", { roomItemId, x, y, rotation });

  const result = await Promise.race([
    moved.then((item) => ({ ok: true as const, item })),
    failed.then((error) => ({ ok: false as const, error })),
  ]);

  if (!result.ok) throw new Error(`No se pudo mover el item: ${result.error.message}`);
  return result.item;
}

/** Quita un RoomItem de la sala. Mismo evento real que usa "recoger" en Build Mode. */
export async function removeItem(socket: GameSocket, roomItemId: string): Promise<void> {
  const removed = waitForEvent(socket, "room:item:removed");
  const failed = waitForEvent<{ message: string }>(socket, "room:item:error");
  socket.emit("room:item:remove", { roomItemId });

  const result = await Promise.race([
    removed.then(() => ({ ok: true as const })),
    failed.then((error) => ({ ok: false as const, error })),
  ]);

  if (!result.ok) throw new Error(`No se pudo eliminar el item: ${result.error.message}`);
}

export type StateBroadcast = {
  roomItemId: string;
  interaction: string;
  state: unknown;
  behavior?: { state: string; via?: string | null; at?: number | null };
};

/** Manda un CLICK. El único payload legítimo: roomItemId + interaction. */
export function sendClick(socket: GameSocket, roomItemId: string): void {
  socket.emit("room:item:interact", { roomItemId, interaction: "CLICK" });
}

export function sendInteraction(
  socket: GameSocket,
  roomItemId: string,
  interaction: string,
): void {
  socket.emit("room:item:interact", { roomItemId, interaction });
}
