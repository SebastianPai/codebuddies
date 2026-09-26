/**
 * Cómo vive el estado de un World Object dentro de `RoomItem.state`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EL PROBLEMA: ESTADO ESTABLE vs TRANSICIÓN EN CURSO
 *
 * Si al hacer click se guardara directamente `ON`, un jugador que entrara a la
 * sala durante los ~400 ms de `turn_on` leería `ON` y vería la TV ya
 * encendida, mientras que quien la clickeó la está viendo encenderse. Es el
 * mismo objeto en dos estados distintos según cuándo llegaste.
 *
 * Así que lo persistido NO es "el estado", es "el estado estable MÁS la
 * transición en curso, con su instante de arranque":
 *
 *     { key: "OFF", via: "turn_on", to: "ON", at: 1789834451432 }
 *       └─ estable   └─ animación   └─ destino  └─ cuándo empezó
 *
 * De ahí sale la propiedad que hace que todo esto funcione:
 *
 *     el estado efectivo es una FUNCIÓN PURA de (lo persistido, ahora)
 *
 * Nadie tiene que "terminar" la transición. Si el jugador que la disparó se
 * desconecta, el dato sigue siendo correcto: pasado el tiempo de la animación,
 * `effectiveStateKey()` devuelve `to` para todo el mundo. No hay trabajo
 * pendiente, ni temporizadores en el servidor, ni estados a medio camino que
 * alguien tenga que limpiar.
 *
 * Una vez asentado, lo persistido es simplemente `{ key: "ON" }`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * COMPATIBILIDAD
 *
 * Va bajo la clave `behavior` DENTRO del Json que ya existe, junto a las
 * claves de siempre y sin tocarlas:
 *
 *     { "on": true, "behavior": { "key": "ON" } }
 *       └─ TOGGLE de siempre, intacto
 *
 * Un objeto sin `behavior` nunca recibe esta clave, así que su `state` es
 * byte por byte el de antes.
 */

import type { WorldBehavior } from './behavior';
import { animationDurationMs } from './frames';
import {
  applyRemoteState,
  createRuntime,
  findAnimation,
  resolveState,
  type RemoteStateUpdate,
  type TriggerResolution,
  type WorldObjectRuntime,
} from './machine';

/** Clave bajo la que vive este bloque dentro de `RoomItem.state`. */
export const BEHAVIOR_STATE_KEY = 'behavior';

export type PersistedBehaviorState = {
  /** Estado estable. Durante una transición sigue siendo el de PARTIDA. */
  key: string;
  /** Animación de paso en curso, si la hay. */
  via: string | null;
  /** Estado al que se llega cuando `via` termina. null = no cambia. */
  to: string | null;
  /** Epoch ms en que el servidor resolvió la transición. */
  at: number | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asKey(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asTimestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Lee el bloque de behavior de un `RoomItem.state` crudo. Defensiva como
 * `readBehavior()`: nunca lanza, y ante basura devuelve null (= objeto sin
 * estado guardado todavía, que arranca en `initialState`).
 */
export function readPersistedState(rawState: unknown): PersistedBehaviorState | null {
  if (!isPlainObject(rawState)) return null;

  const raw = rawState[BEHAVIOR_STATE_KEY];
  if (!isPlainObject(raw)) return null;

  const key = asKey(raw.key);
  if (!key) return null;

  return {
    key,
    via: asKey(raw.via),
    to: asKey(raw.to),
    at: asTimestamp(raw.at),
  };
}

/**
 * Cuánto dura la transición pendiente, o null si no hay ninguna.
 *
 * Sólo cuenta como pendiente si hay un `to`: una animación con
 * `onComplete: NONE` o `REPEAT` no cambia de estado, así que no hay nada que
 * esperar (mismo criterio que `isBusy()` en machine.ts, donde un REPEAT
 * tampoco bloquea — si no, un bucle dejaría el objeto inutilizable para
 * siempre).
 */
function pendingDurationMs(
  behavior: WorldBehavior,
  persisted: PersistedBehaviorState,
): number | null {
  if (!persisted.to || !persisted.via || persisted.at === null) return null;

  const animation = findAnimation(behavior, persisted.via);
  // La animación ya no existe (versión nueva del objeto): no se puede esperar
  // un final que no va a llegar, se da por asentada. Igual que hace `tick()`.
  if (!animation) return 0;

  return animationDurationMs(animation);
}

/**
 * ¿Hay una transición corriendo ahora mismo?
 *
 * Es la protección contra el click spam del lado del SERVIDOR, y sale del dato
 * persistido en vez de un contador en memoria: vale para todos los jugadores
 * de la sala a la vez, sobrevive a un reinicio del proceso y no depende de qué
 * socket mandó el click.
 */
export function isTransitionInFlight(
  behavior: WorldBehavior,
  persisted: PersistedBehaviorState | null,
  now: number,
): boolean {
  if (!persisted) return false;

  const duration = pendingDurationMs(behavior, persisted);
  if (duration === null) return false;

  return now - (persisted.at ?? 0) < duration;
}

/**
 * Estado en el que está REALMENTE el objeto ahora.
 *
 * Con una transición terminada devuelve el destino aunque nadie haya vuelto a
 * escribir en la base — que es lo que permite no tener que cerrar la
 * transición con una segunda escritura.
 *
 * Cae a `resolveState()` para la resolución defensiva: un estado que ya no
 * existe en esta versión del objeto se convierte en el inicial.
 */
export function effectiveStateKey(
  behavior: WorldBehavior,
  persisted: PersistedBehaviorState | null,
  now: number,
): string {
  if (!persisted) return behavior.initialState;

  const duration = pendingDurationMs(behavior, persisted);
  const settled = duration !== null && now - (persisted.at ?? 0) >= duration;

  return resolveState(behavior, settled ? persisted.to : persisted.key).key;
}

/**
 * Bloque a persistir tras resolver un trigger.
 *
 * `SET_STATE` (sin animación de paso) asienta en el acto y no deja transición.
 * `PLAY_ANIMATION` guarda la animación y el instante; `to` sólo se llena si de
 * verdad hay un cambio de estado esperando al final.
 */
export function buildPersistedState(
  resolution: TriggerResolution,
  fromStateKey: string,
  now: number,
): PersistedBehaviorState {
  if (resolution.transition.action === 'SET_STATE') {
    return { key: resolution.nextState, via: null, to: null, at: now };
  }

  const changesState = resolution.nextState !== fromStateKey;

  return {
    key: fromStateKey,
    via: resolution.animationKey,
    to: changesState ? resolution.nextState : null,
    at: now,
  };
}

/**
 * Traduce lo persistido al update que consume `applyRemoteState()`.
 *
 * El cliente recibe el estado FINAL más la animación de paso y el instante en
 * que arrancó; con eso reproduce lo que falte y aterriza en el mismo sitio que
 * todos los demás, entre o no a mitad de camino.
 */
export function toRemoteUpdate(persisted: PersistedBehaviorState): RemoteStateUpdate {
  return {
    state: persisted.to ?? persisted.key,
    via: persisted.via,
    at: persisted.at,
  };
}

/**
 * Runtime listo para dibujar a partir del `RoomItem.state` crudo que llega en
 * `room:items`.
 *
 * Es la puerta de entrada del jugador que ENTRA A LA SALA, y cubre los tres
 * casos con un solo camino, sin ningún `if` en el llamador:
 *
 *   · sin transición        → se queda en el estado estable
 *   · transición reciente   → arranca la animación desde `now - at`, no desde
 *                             el frame 0
 *   · transición terminada  → salta directo al estado final, sin reproducir
 *                             nada y sin esperar otro evento del servidor
 *
 * Los tres salen de `applyRemoteState()`, que es exactamente la misma función
 * que procesa un `room:item:state` en vivo. Entrar a una sala y recibir un
 * evento son el mismo problema, así que comparten implementación.
 */
export function createRuntimeFromPersisted(
  behavior: WorldBehavior,
  rawState: unknown,
  now: number,
): WorldObjectRuntime {
  const persisted = readPersistedState(rawState);

  const runtime = createRuntime(behavior, persisted?.key, now);
  if (!persisted) return runtime;

  return applyRemoteState(behavior, runtime, toRemoteUpdate(persisted), now);
}

/**
 * Mete el bloque en un `RoomItem.state` existente sin tocar el resto.
 *
 * Preserva las claves de siempre (`on`, `open`, `surface`, `width`…) porque un
 * mismo objeto puede tener historia previa, y porque nada de lo viejo debe
 * cambiar por haber estrenado un behavior.
 */
export function writePersistedState(
  rawState: unknown,
  persisted: PersistedBehaviorState,
): Record<string, unknown> {
  const base = isPlainObject(rawState) ? { ...rawState } : {};
  base[BEHAVIOR_STATE_KEY] = { ...persisted };
  return base;
}
