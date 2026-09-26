/**
 * Simulación del comportamiento para la preview del editor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NO HAY UNA SEGUNDA MÁQUINA DE ESTADOS
 *
 * Todo lo que decide qué pasa —`applyTrigger`, `tick`, `activeAnimation`,
 * `computeAnimationFrame`, `animationCell`, `resolveAtlasGeometry`— sale de
 * @codebuddies/world-objects, que es exactamente lo que ejecuta
 * WorldObjectAnimator en la sala. Lo único que añade este módulo es un RELOJ
 * que el creador puede pausar, acelerar y reiniciar.
 *
 * Por eso lo que se ve en el editor es lo que va a pasar en el juego, y no una
 * aproximación que se desincroniza. Hay un test que lo comprueba corriendo las
 * dos implementaciones en paralelo (behavior-preview.parity.spec.ts).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EL RELOJ ES DE SIMULACIÓN, NO DE PARED
 *
 * `clock` empieza en 0 y avanza `delta * speed` sólo mientras `playing`. La
 * máquina nunca se entera: sigue recibiendo un número de milisegundos que
 * crece, así que pausar es simplemente dejar de sumarle, y ponerlo a 2x es
 * sumarle el doble. No hace falta tocar `fps` ni ninguna duración del
 * `WorldBehavior` — que son datos del objeto, no de la previsualización.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SIN REACT
 *
 * TypeScript puro, como `behavior-draft.ts`: `apps/web` no tiene runner de
 * tests, así que la lógica vive acá y se prueba con el Jest de `apps/api`. El
 * componente sólo dibuja.
 */

import {
  activeAnimation,
  animationCell,
  applyTrigger,
  computeAnimationFrame,
  createRuntime,
  isBusy,
  resolveAtlasGeometry,
  resolveState,
  tick,
  validateBehavior,
  type AtlasGeometry,
  type WorldAnimation,
  type WorldBehavior,
  type WorldObjectRuntime,
} from "@codebuddies/world-objects";

/** Velocidades que ofrece la preview. Sólo afectan al reloj de simulación. */
export const PREVIEW_SPEEDS = [0.5, 1, 2] as const;
export type PreviewSpeed = (typeof PREVIEW_SPEEDS)[number];

export type PreviewState = {
  runtime: WorldObjectRuntime;
  /** Milisegundos de SIMULACIÓN transcurridos. Empieza en 0. */
  clock: number;
  playing: boolean;
  speed: PreviewSpeed;
  /** Cara que se está mirando, para las animaciones direccionales. */
  direction: number;
  /** Qué pasó con el último "probar click". null = todavía no se probó. */
  lastClick: PreviewClick | null;
};

/**
 * Resultado del último click de prueba, para poder CONTARLO.
 *
 * Antes sólo se guardaba "se ignoró", y el creador que hacía click veía cambiar
 * el sprite sin que nada le dijera de qué estado a qué estado había pasado —
 * ni por qué a veces no pasaba nada.
 */
export type PreviewClick = {
  /** Estado desde el que se hizo click. */
  from: string;
  /** Animación de paso, si la transición reproduce una. */
  via: string | null;
  /** Estado en el que va a terminar. Igual a `from` si no pasó nada. */
  to: string;
  /** No hay ninguna transición de click desde `from`. */
  ignored: boolean;
  /** Se ignoró porque había una transición en curso (el objeto está ocupado). */
  busy: boolean;
};

/** Medidas reales del PNG del atlas, leídas del navegador. */
export type AtlasSize = { width: number; height: number };

export type PreviewSnapshot = {
  /** Estado ESTABLE actual (durante una transición, el de partida). */
  stateKey: string;
  /** Hay una animación de paso corriendo. */
  inTransition: boolean;
  animationKey: string | null;
  spriteSheetUrl: string | null;
  /** Frame actual, 0-based. -1 si no hay animación. */
  frame: number;
  framesCount: number;
  /** Celda del atlas, o null si no se puede dibujar todavía. */
  cell: { row: number; col: number } | null;
  geometry: AtlasGeometry | null;
  /** Direcciones que ofrece esta animación (1 = no direccional). */
  directionCount: number;
};

// ─────────────────────────── construcción ───────────────────────────

export function createPreviewState(
  behavior: WorldBehavior,
  options: { speed?: PreviewSpeed; direction?: number } = {},
): PreviewState {
  return {
    runtime: createRuntime(behavior, null, 0),
    clock: 0,
    playing: true,
    speed: options.speed ?? 1,
    direction: options.direction ?? 0,
    lastClick: null,
  };
}

/** ¿Se puede simular? Un behavior a medias no. */
export function canPreview(behavior: WorldBehavior): boolean {
  return validateBehavior(behavior).ok;
}

// ─────────────────────────── controles ───────────────────────────

/**
 * Avanza el reloj con el tiempo REAL transcurrido desde el último tick.
 *
 * En pausa no avanza nada y el estado queda exactamente donde estaba: al
 * reanudar se sigue desde el mismo punto, porque el reloj de simulación no
 * tiene ninguna relación con la hora del sistema.
 */
export function advancePreview(
  behavior: WorldBehavior,
  state: PreviewState,
  realDeltaMs: number,
): PreviewState {
  if (!state.playing) return state;

  const delta = Number.isFinite(realDeltaMs) ? Math.max(0, realDeltaMs) : 0;
  if (delta === 0) return state;

  const clock = state.clock + delta * state.speed;
  const runtime = tick(behavior, state.runtime, clock);

  return { ...state, clock, runtime };
}

/**
 * Simula un click. Usa `applyTrigger()`, la misma función del paquete que
 * consume el juego — acá no hay ningún `if (estado === "OFF")`.
 */
export function triggerPreview(
  behavior: WorldBehavior,
  state: PreviewState,
): PreviewState {
  const from = state.runtime.stateKey;
  // Ocupado y "no reacciona" son dos motivos distintos para que un click no
  // haga nada, y al creador le importan de forma distinta: uno es esperar, el
  // otro es que falta configurar algo. `applyTrigger` devuelve el mismo
  // `accepted: false` para ambos, así que se distinguen acá.
  const busy = isBusy(state.runtime);
  const outcome = applyTrigger(behavior, state.runtime, "CLICK", state.clock);

  if (!outcome.accepted || !outcome.resolution) {
    return {
      ...state,
      lastClick: { from, via: null, to: from, ignored: !busy, busy },
    };
  }

  const { transition, nextState } = outcome.resolution;

  return {
    ...state,
    runtime: outcome.runtime,
    lastClick: {
      from,
      via: transition.action === "PLAY_ANIMATION" ? transition.animation : null,
      to: nextState,
      ignored: false,
      busy: false,
    },
  };
}

export function setPreviewPlaying(state: PreviewState, playing: boolean): PreviewState {
  return { ...state, playing };
}

export function setPreviewSpeed(state: PreviewState, speed: PreviewSpeed): PreviewState {
  return { ...state, speed };
}

export function setPreviewDirection(state: PreviewState, direction: number): PreviewState {
  return { ...state, direction: Math.max(0, Math.trunc(direction)) };
}

/**
 * Vuelve al estado inicial: reloj a 0, sin transición en curso.
 *
 * Conserva velocidad y dirección, que son preferencias de quien mira y no
 * parte de la simulación. NO toca el draft: esto reinicia la prueba, no el
 * comportamiento que se está editando.
 */
export function resetPreview(
  behavior: WorldBehavior,
  state: PreviewState,
): PreviewState {
  return createPreviewState(behavior, {
    speed: state.speed,
    direction: state.direction,
  });
}

/**
 * Arranca la simulación en un estado concreto, para "previsualizar este
 * estado" desde su tarjeta.
 *
 * Es temporal y local: no cambia `initialState` ni nada del draft. Un estado
 * que no existe cae al inicial por la resolución defensiva del paquete.
 */
export function previewFromState(
  behavior: WorldBehavior,
  state: PreviewState,
  stateKey: string,
): PreviewState {
  const resolved = resolveState(behavior, stateKey);

  return {
    ...createPreviewState(behavior, { speed: state.speed, direction: state.direction }),
    runtime: createRuntime(behavior, resolved.key, 0),
  };
}

// ─────────────────────────── qué dibujar ───────────────────────────

/**
 * Todo lo que el componente necesita pintar, derivado del reloj.
 *
 * `atlas` son las medidas reales del PNG. Si todavía no llegó (o falló), se
 * devuelve igual el estado lógico y `cell: null` — poder dibujar y poder
 * avanzar la máquina son dos cosas distintas, que es la lección que dejó la
 * Fase 5. La preview no se congela por culpa de un asset.
 */
export function describePreview(
  behavior: WorldBehavior,
  state: PreviewState,
  atlas: AtlasSize | null | undefined,
  directions: number,
): PreviewSnapshot {
  const active = activeAnimation(behavior, state.runtime);
  const stateKey = resolveState(behavior, state.runtime.stateKey).key;

  if (!active) {
    return {
      stateKey,
      inTransition: state.runtime.playing !== null,
      animationKey: null,
      spriteSheetUrl: null,
      frame: -1,
      framesCount: 0,
      cell: null,
      geometry: null,
      directionCount: 1,
    };
  }

  const animation: WorldAnimation = active.animation;
  const geometry = resolveAtlasGeometry(animation, atlas, directions);
  const directionCount = geometry?.rows ?? (animation.directional ? Math.max(1, directions) : 1);

  const { frame } = computeAnimationFrame(animation, state.clock - active.startedAt);
  const direction = Math.min(state.direction, directionCount - 1);

  return {
    stateKey,
    inTransition: active.fromTransition,
    animationKey: animation.key,
    spriteSheetUrl: animation.spriteSheetUrl,
    frame,
    framesCount: animation.framesCount,
    // Sin geometría no se dibuja, pero el frame lógico de arriba sí es válido.
    cell: geometry ? animationCell(animation, frame, direction) : null,
    geometry,
    directionCount,
  };
}
