// network/realtime.ts
//
// Puente de tiempo real para el sistema social (amigos/mensajes/notificaciones).
// Es un canal SEPARADO del socket.io del juego (network/socket.ts): el backend
// no relaciona friendships/messages/notifications con el GameGateway, así que
// aquí no se reutiliza el socket del juego — se replica el mismo patrón que ya
// usa apps/web/components/Navbar.tsx: un único EventSource (SSE) a
// /realtime/events, cuyos eventos se reemiten como CustomEvent en `window`
// con el prefijo "codebuddies:" para que cualquier componente los escuche sin
// acoplarse a este módulo.
//
// A diferencia de Navbar.tsx (que cierra la conexión tras 5 min de inactividad,
// pensado para una pestaña de sitio que se puede dejar abierta sin usar), en el
// juego la conexión se mantiene abierta mientras dura la sesión de juego.

import { getSharedAuthToken } from "./auth";
import { getApiUrl } from "../../config/env";

const API_URL = getApiUrl();
const PRESENCE_SESSION_KEY = "codebuddies:presence-session-id";

export const REALTIME_EVENTS = [
  "presence:update",
  "friendship:request",
  "friendship:accepted",
  "message:new",
  "message:seen",
  "message:delivered",
  "message:typing",
  "message:reaction",
  "conversation:deleted",
  "notification:new",
] as const;

let source: EventSource | null = null;

function getPresenceSessionId(): string {
  let sessionId = sessionStorage.getItem(PRESENCE_SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(PRESENCE_SESSION_KEY, sessionId);
  }
  return sessionId;
}

/** Abre (o reutiliza) la conexión SSE del sistema social. Llamar una vez tras el login. */
export function connectRealtime(): void {
  if (typeof window === "undefined") return;
  if (source) return;

  const token = getSharedAuthToken();
  if (!token) return;

  const sessionId = getPresenceSessionId();
  source = new EventSource(
    `${API_URL}/realtime/events?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(sessionId)}`,
  );

  REALTIME_EVENTS.forEach((eventName) => {
    source!.addEventListener(eventName, (event) => {
      let detail: unknown = null;
      try {
        detail = JSON.parse((event as MessageEvent).data);
      } catch {
        detail = null;
      }
      window.dispatchEvent(new CustomEvent(`codebuddies:${eventName}`, { detail }));
    });
  });

  source.onerror = () => {
    // EventSource reintenta la conexión solo; no hace falta manejarlo a mano.
    console.warn("[realtime] Error de conexión SSE, reintentando...");
  };
}

/** Cierra la conexión SSE y avisa al backend que la sesión quedó offline. */
export function disconnectRealtime(): void {
  if (typeof window === "undefined") return;

  source?.close();
  source = null;

  const token = getSharedAuthToken();
  const sessionId = sessionStorage.getItem(PRESENCE_SESSION_KEY);
  if (token && sessionId) {
    navigator.sendBeacon?.(
      `${API_URL}/realtime/offline?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(sessionId)}`,
    );
  }
}
