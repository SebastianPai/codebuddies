/**
 * MÁQUINA DE ESTADOS de un World Object. Pura: sin Phaser, sin React, sin
 * reloj propio — el `now` siempre entra por parámetro.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DOS NIVELES, A PROPÓSITO
 *
 *   1. `resolveTrigger()` — SIN estado de reproducción. Es la que usa el
 *      SERVIDOR: dado el estado persistido en `RoomItem.state` y un trigger,
 *      dice a qué estado queda el objeto y por qué animación pasó. El
 *      servidor guarda el estado FINAL de una vez y lo difunde a la sala; así
 *      un jugador que entra tarde ve la TV encendida, no una TV a mitad de
 *      transición que nadie va a terminar por él.
 *
 *   2. `WorldObjectRuntime` — CON estado de reproducción. Es lo que usan el
 *      juego y el preview para dibujar: qué animación está corriendo, desde
 *      cuándo, y qué hacer cuando termine.
 *
 * El cliente NUNCA decide el estado por su cuenta: hace click, el servidor
 * responde, y el runtime refleja esa respuesta. De ahí sale gratis la
 * resistencia al click spam (punto 21): 20 clicks son, como mucho, 20
 * peticiones que el servidor resuelve secuencialmente, y el runtime rechaza
 * las que llegan mientras una transición está en el aire.
 */

import {
  readBehavior,
  type WorldBehavior,
  type WorldAnimation,
  type WorldCompletion,
  type WorldObjectState,
  type WorldTransition,
  type WorldTrigger,
} from './behavior';
import { animationDurationMs, computeAnimationFrame } from './frames';

/** Cómo se clasifica un objeto en el Marketplace. Derivado, no almacenado. */
export type WorldObjectKindLabel = 'STATIC' | 'ANIMATED' | 'INTERACTIVE';

export type WorldObjectRuntime = {
  /** Estado lógico actual. Siempre una clave que existe en el behavior. */
  stateKey: string;
  /** Cuándo se entró a este estado (para cronometrar su animación de loop). */
  stateSince: number;
  /**
   * Animación de TRANSICIÓN en curso. Las animaciones de estado (el loop de
   * un estado activo) no viven acá: se derivan del estado y no bloquean nada.
   * `playing !== null` con un onComplete que no sea REPEAT es exactamente la
   * definición de "ocupado".
   */
  playing: {
    animationKey: string;
    startedAt: number;
    onComplete: WorldCompletion;
  } | null;
};

/** Lo que el servidor difunde a la sala tras una interacción. */
export type RemoteStateUpdate = {
  /** Estado FINAL, ya persistido. */
  state: string;
  /** Animación de paso, si hubo. */
  via?: string | null;
  /** Momento (epoch ms) en que el servidor resolvió la transición. */
  at?: number | null;
};

// ───────────────────────── lecturas defensivas ─────────────────────────

/**
 * Estado correspondiente a una clave, con caída determinista.
 *
 * Es el mecanismo de VERSIONADO del sistema: si el creador publica una
 * versión nueva del objeto sin el estado "ON", los RoomItem que quedaron
 * guardados con `state.key = "ON"` no se rompen — caen al estado inicial. Sin
 * tabla ItemVersion, sin migración de datos, sin salas rotas.
 *
 * El orden es: la clave pedida → el estado inicial → el primero declarado.
 */
export function resolveState(behavior: WorldBehavior, key?: string | null): WorldObjectState {
  const exact = behavior.states.find((state) => state.key === key);
  if (exact) return exact;

  const initial = behavior.states.find((state) => state.key === behavior.initialState);
  if (initial) return initial;

  // `validateBehavior` garantiza states.length >= 1 y `repairBehavior`
  // devuelve null antes de dejar la lista vacía, así que esto existe.
  return behavior.states[0];
}

export function findAnimation(
  behavior: WorldBehavior,
  key?: string | null,
): WorldAnimation | null {
  if (!key) return null;
  return behavior.animations.find((animation) => animation.key === key) ?? null;
}

/** La transición para (estado, trigger), o null si ese par no está definido. */
export function findTransition(
  behavior: WorldBehavior,
  stateKey: string,
  trigger: WorldTrigger,
): WorldTransition | null {
  return (
    behavior.transitions.find(
      (transition) => transition.trigger === trigger && transition.fromState === stateKey,
    ) ?? null
  );
}

/** ¿Este objeto reacciona al click? Lo consulta el juego antes de interactuar. */
export function hasTrigger(behavior: WorldBehavior | null, trigger: WorldTrigger): boolean {
  if (!behavior) return false;
  return behavior.transitions.some((transition) => transition.trigger === trigger);
}

/**
 * Etiqueta para el Marketplace, DERIVADA del behavior. No hay columna nueva
 * ni un campo que el creador pueda poner mal: un objeto es INTERACTIVE si
 * tiene transiciones, ANIMATED si sólo tiene animaciones, y STATIC si no
 * tiene behavior.
 */
export function describeBehaviorKind(behavior: WorldBehavior | null): WorldObjectKindLabel {
  if (!behavior) return 'STATIC';
  if (behavior.transitions.length > 0) return 'INTERACTIVE';
  if (behavior.animations.length > 0) return 'ANIMATED';
  return 'STATIC';
}

// ────────────────────────── resolución (servidor) ──────────────────────────

export type TriggerResolution = {
  transition: WorldTransition;
  /** Animación de paso, si la transición tiene una. */
  animationKey: string | null;
  /** Estado en el que queda el objeto una vez asentado. Es lo que se persiste. */
  nextState: string;
};

/**
 * Qué provoca un trigger, mirando sólo el dato persistido. La usa el
 * servidor; no necesita saber nada de reproducción.
 *
 * Devuelve null cuando no hay transición para ese par (estado, trigger) —
 * caso normal, no un error: un mueble en un estado sin salidas simplemente
 * no reacciona.
 */
export function resolveTrigger(
  behavior: WorldBehavior,
  stateKey: string | null | undefined,
  trigger: WorldTrigger,
): TriggerResolution | null {
  const current = resolveState(behavior, stateKey);
  const transition = findTransition(behavior, current.key, trigger);
  if (!transition) return null;

  if (transition.action === 'SET_STATE') {
    return { transition, animationKey: null, nextState: transition.state };
  }

  const nextState =
    transition.onComplete.action === 'SET_STATE' ? transition.onComplete.state : current.key;

  return { transition, animationKey: transition.animation, nextState };
}

// ────────────────────────── runtime (juego / preview) ──────────────────────────

/**
 * Runtime inicial a partir del estado persistido. No arranca ninguna
 * transición: para eso está `applyTrigger(..., 'ROOM_ENTER', ...)`, que el
 * llamador invoca aparte si quiere ese comportamiento.
 */
export function createRuntime(
  behavior: WorldBehavior,
  persistedStateKey: string | null | undefined,
  now: number,
): WorldObjectRuntime {
  return {
    stateKey: resolveState(behavior, persistedStateKey).key,
    stateSince: now,
    playing: null,
  };
}

/**
 * ¿Está en medio de una transición que no admite interrupciones?
 *
 * REPEAT no bloquea: una animación que se repite sola no tiene final que
 * esperar, y bloquear ahí dejaría el objeto muerto para siempre.
 */
export function isBusy(runtime: WorldObjectRuntime): boolean {
  return runtime.playing !== null && runtime.playing.onComplete.action !== 'REPEAT';
}

export type TriggerOutcome = {
  runtime: WorldObjectRuntime;
  /**
   * Si el trigger se tomó. `false` cuando no había transición para ese par o
   * cuando el objeto estaba ocupado — en ese caso `runtime` es el mismo
   * objeto de entrada (identidad preservada, para que un `===` valga como
   * "no cambió nada").
   */
  accepted: boolean;
  resolution: TriggerResolution | null;
};

/**
 * Aplica un trigger al runtime.
 *
 * ── CLICK SPAM ──
 * Mientras una transición no-loop está corriendo, los triggers siguientes se
 * descartan (`accepted: false`). 20 clicks rápidos sobre la TV producen UNA
 * animación y UN cambio de estado; no hay animaciones superpuestas ni
 * estados a medio camino. El servidor aplica la misma regla por su lado, así
 * que tampoco se puede forzar salteando la UI.
 */
export function applyTrigger(
  behavior: WorldBehavior,
  runtime: WorldObjectRuntime,
  trigger: WorldTrigger,
  now: number,
): TriggerOutcome {
  if (isBusy(runtime)) {
    return { runtime, accepted: false, resolution: null };
  }

  const resolution = resolveTrigger(behavior, runtime.stateKey, trigger);
  if (!resolution) {
    return { runtime, accepted: false, resolution: null };
  }

  if (resolution.transition.action === 'SET_STATE') {
    return {
      runtime: { stateKey: resolution.nextState, stateSince: now, playing: null },
      accepted: true,
      resolution,
    };
  }

  return {
    runtime: {
      stateKey: runtime.stateKey,
      stateSince: runtime.stateSince,
      playing: {
        animationKey: resolution.transition.animation,
        startedAt: now,
        onComplete: resolution.transition.onComplete,
      },
    },
    accepted: true,
    resolution,
  };
}

/**
 * Avanza el reloj: asienta la transición si su animación ya terminó.
 *
 * Devuelve el MISMO objeto si no hubo cambio, para que el llamador pueda
 * comparar por identidad y no tocar el sprite de balde.
 */
export function tick(
  behavior: WorldBehavior,
  runtime: WorldObjectRuntime,
  now: number,
): WorldObjectRuntime {
  const playing = runtime.playing;
  if (!playing) return runtime;

  const animation = findAnimation(behavior, playing.animationKey);
  // La animación desapareció del behavior (versión nueva del objeto): no se
  // puede esperar un final que no va a llegar, se asienta ya.
  if (!animation) {
    return settle(runtime, playing.onComplete, now);
  }

  const duration = animationDurationMs(animation);
  const { completed } = computeAnimationFrame(animation, now - playing.startedAt);
  if (!completed) return runtime;

  if (playing.onComplete.action === 'REPEAT') {
    // Se adelanta el arranque una pasada exacta en vez de ponerlo en `now`:
    // así no acumula el desfase del frame en que se detectó el final y la
    // repetición queda con la misma cadencia que un loop de verdad.
    return {
      ...runtime,
      playing: {
        ...playing,
        startedAt: playing.startedAt + duration,
      },
    };
  }

  // El estado nuevo empieza a contar desde que la animación TERMINÓ, no desde
  // este tick: así la fase del bucle no depende de la cadencia del reloj.
  return settle(runtime, playing.onComplete, playing.startedAt + duration);
}

/**
 * Asienta una transición.
 *
 * `endedAt` es el instante en que la animación TERMINÓ, no aquel en que se
 * detectó que había terminado. La diferencia importa: `stateSince` es el
 * origen del reloj de la animación del estado nuevo, así que si se usara el
 * momento de la detección, la fase del bucle dependería de cada cuánto
 * ticaran los relojes de cada cliente — y dos jugadores mirando la misma TV
 * verían `screen_loop` en frames distintos.
 *
 * Con el instante exacto (`startedAt + duración`), todos derivan la misma
 * fase del mismo dato del servidor, sin importar su cadencia de cuadros.
 */
function settle(
  runtime: WorldObjectRuntime,
  onComplete: WorldCompletion,
  endedAt: number,
): WorldObjectRuntime {
  if (onComplete.action === 'SET_STATE') {
    return { stateKey: onComplete.state, stateSince: endedAt, playing: null };
  }
  return { stateKey: runtime.stateKey, stateSince: runtime.stateSince, playing: null };
}

/**
 * Sincroniza el runtime con lo que difundió el servidor (`room:item:state`).
 *
 * El servidor manda el estado FINAL más la animación de paso y el momento en
 * que la resolvió. Con eso:
 *
 *   · el jugador que hizo click ve la animación completa;
 *   · otro jugador de la sala también, con el desfase de red como único
 *     retraso;
 *   · quien entra a la sala a mitad de animación calcula cuánto lleva
 *     corriendo y, si ya terminó, salta directo al estado final.
 *
 * Es lo que evita una solución "local" que sólo funcione para quien clickeó.
 */
export function applyRemoteState(
  behavior: WorldBehavior,
  runtime: WorldObjectRuntime,
  update: RemoteStateUpdate,
  now: number,
): WorldObjectRuntime {
  const target = resolveState(behavior, update.state);
  const animation = findAnimation(behavior, update.via);

  if (!animation) {
    if (target.key === runtime.stateKey && !runtime.playing) return runtime;
    return { stateKey: target.key, stateSince: now, playing: null };
  }

  const startedAt = typeof update.at === 'number' && Number.isFinite(update.at) ? update.at : now;
  const { completed } = computeAnimationFrame(animation, now - startedAt);

  // Un loop como animación de paso nunca "completa": se deja corriendo con
  // el estado final ya aplicado, que es lo que el creador describió.
  if (completed) {
    // Mismo criterio que `tick()`: el estado cuenta desde que la animación
    // terminó. Es lo que hace que quien entra tarde a la sala vea el bucle
    // EN LA MISMA FASE que quien ya estaba, y no reiniciado.
    return {
      stateKey: target.key,
      stateSince: startedAt + animationDurationMs(animation),
      playing: null,
    };
  }

  return {
    stateKey: runtime.stateKey,
    stateSince: runtime.stateSince,
    playing: {
      animationKey: animation.key,
      startedAt,
      onComplete: { action: 'SET_STATE', state: target.key },
    },
  };
}

// ─────────────────────────── qué dibujar ───────────────────────────

export type ActiveAnimation = {
  animation: WorldAnimation;
  /** Momento en que arrancó, para calcular el frame con `now`. */
  startedAt: number;
  /** true si es la animación de la transición en curso. */
  fromTransition: boolean;
};

/**
 * Qué animación corresponde dibujar ahora: la de la transición si hay una en
 * curso, si no la del estado activo (el loop), si no nada.
 *
 * `null` significa "frame estático": el objeto no consume ni un ciclo en el
 * bucle de animación. Es la clave del punto de rendimiento — 50 objetos
 * quietos cuestan lo mismo que hoy.
 */
export function activeAnimation(
  behavior: WorldBehavior,
  runtime: WorldObjectRuntime,
): ActiveAnimation | null {
  if (runtime.playing) {
    const animation = findAnimation(behavior, runtime.playing.animationKey);
    if (animation) {
      return { animation, startedAt: runtime.playing.startedAt, fromTransition: true };
    }
  }

  const state = resolveState(behavior, runtime.stateKey);
  const animation = findAnimation(behavior, state.animation);
  if (!animation) return null;

  return { animation, startedAt: runtime.stateSince, fromTransition: false };
}

/**
 * Atajo de lectura para quien sólo tiene el JSON crudo de la base: lee
 * defensivamente y arma el runtime. Devuelve null si el objeto no tiene
 * behavior usable — o sea, si es uno de los objetos de siempre.
 */
export function createRuntimeFromRaw(
  rawBehavior: unknown,
  persistedStateKey: string | null | undefined,
  now: number,
): { behavior: WorldBehavior; runtime: WorldObjectRuntime } | null {
  const behavior = readBehavior(rawBehavior);
  if (!behavior) return null;
  return { behavior, runtime: createRuntime(behavior, persistedStateKey, now) };
}
