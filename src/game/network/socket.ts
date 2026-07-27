// network/socket.ts

import { io, Socket } from "socket.io-client";
import { getSharedAuthToken } from "./auth";
import { showGameAlert } from "../utils/dialog";
import { audioManager } from "../audio/AudioManager";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL!;

// Eventos de error que el gateway emite y que antes no tenían ningún listener en
// el cliente: fallaban en silencio (compra, sala, avatar, inventario...).
const SERVER_ERROR_EVENTS = [
  "room:error",
  "room:item:error",
  "avatar:equip:error",
  "avatar:get:error",
  "avatar:update:error",
  "shop:item:error",
  "shop:items:error",
  "player:stats:error",
  "inventory:error",
  "apps:error",
] as const;

let socket: Socket | null = null;
let isConnecting = false;
let hasConnectedBefore = false;

function wireServerErrorAlerts(s: Socket) {
  SERVER_ERROR_EVENTS.forEach((eventName) => {
    s.on(eventName, (data: any) => {
      console.error(`[socket] ${eventName}`, data);
      audioManager.play("error");
      void showGameAlert({
        title: "Algo salió mal",
        message: data?.message || data?.reason || "Ocurrió un error inesperado. Intenta de nuevo.",
        confirmLabel: "Entendido",
        tone: "danger",
      });
    });
  });
}

// Tras perder y recuperar la conexión, socket.io asigna un socket.id nuevo:
// el servidor ya no asocia este socket a ninguna sala ni jugador hasta que
// se re-emitan estos eventos, o el movimiento se descarta en silencio.
function resyncAfterReconnect(s: Socket) {
  console.log("[socket] Reconectado, resincronizando sesión");

  const roomId = (window as any).currentRoomId;
  if (roomId) {
    s.emit("joinRoom", { roomId });
  }

  s.emit("avatar:get");
  s.emit("player:stats:get");
  s.emit("inventory:get");
}

export function createSocket(): Socket {
  // Reutilizar socket existente
  if (socket && (socket.connected || socket.active)) {
    console.log("[socket] Reutilizando socket existente:", socket.id);

    return socket;
  }

  // Evitar múltiples conexiones simultáneas
  if (isConnecting) {
    console.warn("[socket] Conexión en progreso, esperando...");

    if (socket) return socket;
  }

  isConnecting = true;

  socket = io(SOCKET_URL, {
    withCredentials: true,
    // Función, no objeto: así se relee el token en cada intento de conexión
    // (incluidas las reconexiones), en vez de quedar fijo con el valor de
    // cuando se creó el socket.
    auth: (cb) => cb({ token: getSharedAuthToken() }),

    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,

    timeout: 10000,

    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("[socket] Conectado:", socket!.id);

    isConnecting = false;

    if (hasConnectedBefore) {
      resyncAfterReconnect(socket!);
    }
    hasConnectedBefore = true;
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] Desconectado:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[socket] Error de conexión:", err.message);

    isConnecting = false;
  });

  wireServerErrorAlerts(socket);

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

