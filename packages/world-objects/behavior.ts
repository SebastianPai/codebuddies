/**
 * CONTRATO DECLARATIVO de un World Object interactivo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ ES Y QUÉ NO ES
 *
 * Un `behavior` es DATO, no código. Está hecho sólo de enums cerrados,
 * enteros acotados y claves que se comparan por igualdad exacta. No hay
 * expresiones, ni strings que se evalúen, ni nada que pueda convertirse en
 * JavaScript: un creador del Marketplace puede describir "al hacer click
 * estando en OFF, reproducí turn_on y al terminar pasá a ON", y nada más.
 * `validateBehavior()` RECHAZA cualquier clave desconocida, así que un
 * payload con un campo extra no llega a la base de datos.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * behavior = null  ⇒  OBJETO ACTUAL, SIN CAMBIOS
 *
 * Es la garantía de compatibilidad del sistema entero. Todo lo que hay hoy
 * en una sala tiene `behavior = null` y debe seguir renderizándose e
 * interactuando exactamente como antes (sprite estático recortado por
 * dirección, TOGGLE/OPEN por menú). Ninguna función de este paquete inventa
 * un behavior por defecto: si no hay dato, no hay máquina de estados.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DOS PUERTAS DE ENTRADA, A PROPÓSITO
 *
 *   validateBehavior()  → ESTRICTA. La usa el servidor al guardar. Devuelve
 *                         la lista de errores; con un solo error no se
 *                         persiste nada.
 *   readBehavior()      → DEFENSIVA. La usan el juego y el preview al leer.
 *                         Nunca lanza. Ante un dato inconsistente descarta
 *                         lo inválido y, si no queda nada usable, devuelve
 *                         null — o sea, el objeto cae a "estático".
 *
 * Es el mismo criterio que `resolveOrigin()` en engine-data.util.ts: el
 * escritor es severo, el lector es indulgente y determinista. Sin esto, un
 * behavior corrupto (editado a mano en la DB, o de una versión del objeto
 * que ya no existe) tiraría abajo el render de la sala entera.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LAYOUT DEL ATLAS  (columnas = frames, filas = direcciones)
 *
 * Cada animación ocupa un bloque de filas consecutivas a partir de `row`:
 * `directions` filas si es `directional`, una sola si no. Dentro de la fila,
 * `framesCount` columnas a partir de `startCol`. Es el mismo convenio que ya
 * usan los clips de PetSpeciesConfig y PetSystem.
 *
 * OJO — NO es el layout de los items actuales, que son una tira HORIZONTAL
 * donde la columna es la dirección y no existe el eje de frames. Los dos
 * conviven sin ambigüedad porque los items viejos tienen `behavior = null` y
 * siguen por su camino de siempre.
 */

import { WORLD_OBJECT_LIMITS as L } from './limits';

// ─────────────────────────────── enums ───────────────────────────────

/**
 * Qué provoca una transición.
 *
 * CLICK y ROOM_ENTER son los únicos implementados. Los demás están
 * declarados para que agregarlos después no cambie la forma del dato ni
 * obligue a migrar behaviors ya guardados — pero `IMPLEMENTED_TRIGGERS` es
 * lo que el validador acepta hoy, así que nadie puede publicar un objeto que
 * dependa de algo que todavía no corre.
 */
export const WORLD_TRIGGERS = [
  'CLICK',
  'ROOM_ENTER',
  // Reservados: declarados, NO implementados.
  'PLAYER_INTERACT',
  'PROXIMITY',
  'USE_ITEM',
  'DOUBLE_CLICK',
] as const;

export type WorldTrigger = (typeof WORLD_TRIGGERS)[number];

export const IMPLEMENTED_TRIGGERS: readonly WorldTrigger[] = ['CLICK', 'ROOM_ENTER'];

/** Qué hace una transición cuando se dispara. */
export const WORLD_ACTIONS = ['PLAY_ANIMATION', 'SET_STATE'] as const;
export type WorldAction = (typeof WORLD_ACTIONS)[number];

/** Qué pasa cuando la animación de la transición termina. */
export const WORLD_COMPLETION_ACTIONS = ['SET_STATE', 'REPEAT', 'NONE'] as const;
export type WorldCompletionAction = (typeof WORLD_COMPLETION_ACTIONS)[number];

// ─────────────────────────────── tipos ───────────────────────────────

/** Una secuencia de frames dentro del atlas del objeto. */
export type WorldAnimation = {
  key: string;
  /** Primera fila del bloque de esta animación en el atlas. */
  row: number;
  /** Primera columna (frame 0). */
  startCol: number;
  framesCount: number;
  fps: number;
  loop: boolean;
  /**
   * Si tiene una fila por dirección (el bloque ocupa `directions` filas) o
   * una sola que se reusa en las 4 rotaciones. Una pantalla de TV encendida
   * suele necesitar las 4; el agua de una bañera vista desde arriba, una.
   */
  directional: boolean;
  /**
   * Atlas propio de esta animación. Si es null usa el del objeto. Misma
   * escotilla que `PetAnimClip.spriteSheetUrl`, para un objeto cuyo arte no
   * cabe en una sola hoja.
   */
  spriteSheetUrl: string | null;
};

/**
 * Un estado lógico del objeto. `animation` es la que se reproduce MIENTRAS
 * el objeto está en ese estado — normalmente un loop (screen_loop,
 * water_loop, idle_loop) o nada (estado quieto de un frame).
 */
export type WorldObjectState = {
  key: string;
  animation: string | null;
};

/** Qué hacer al terminar la animación de una transición. */
export type WorldCompletion =
  | { action: 'SET_STATE'; state: string }
  | { action: 'REPEAT' }
  | { action: 'NONE' };

/**
 * `trigger` + `fromState`  →  acción.
 *
 * PLAY_ANIMATION reproduce `animation` y recién al terminar aplica
 * `onComplete`. SET_STATE cambia el estado en el acto, sin animación de
 * paso (una lámpara que sólo cambia de frame).
 */
export type WorldTransition =
  | {
      trigger: WorldTrigger;
      fromState: string;
      action: 'PLAY_ANIMATION';
      animation: string;
      onComplete: WorldCompletion;
    }
  | {
      trigger: WorldTrigger;
      fromState: string;
      action: 'SET_STATE';
      state: string;
    };

export type WorldBehavior = {
  version: 1;
  initialState: string;
  states: WorldObjectState[];
  animations: WorldAnimation[];
  transitions: WorldTransition[];
};

export type ValidationResult =
  | { ok: true; behavior: WorldBehavior; errors: string[] }
  | { ok: false; behavior: null; errors: string[] };

// ───────────────────────── helpers de parseo ─────────────────────────

/**
 * Claves de estado y de animación: ASCII, empiezan por letra. Sin puntos,
 * sin barras, sin unicode — una clave nunca es una ruta ni un identificador
 * que se interpole en nada, y así queda imposible que lo parezca.
 */
const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKey(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= L.maxKeyLength &&
    KEY_PATTERN.test(value)
  );
}

function asInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

/** Los campos que NO estén en `allowed` son un error, no algo a ignorar. */
function unknownKeys(source: Record<string, unknown>, allowed: readonly string[]): string[] {
  return Object.keys(source).filter((key) => !allowed.includes(key));
}

const ANIMATION_KEYS = [
  'key',
  'row',
  'startCol',
  'framesCount',
  'fps',
  'loop',
  'directional',
  'spriteSheetUrl',
] as const;

const STATE_KEYS = ['key', 'animation'] as const;

const TRANSITION_KEYS = [
  'trigger',
  'fromState',
  'action',
  'animation',
  'onComplete',
  'state',
] as const;

const COMPLETION_KEYS = ['action', 'state'] as const;

const BEHAVIOR_KEYS = ['version', 'initialState', 'states', 'animations', 'transitions'] as const;

// ────────────────────────────── validación ──────────────────────────────

function parseAnimation(raw: unknown, index: number, errors: string[]): WorldAnimation | null {
  const at = `animations[${index}]`;
  if (!isPlainObject(raw)) {
    errors.push(`${at}: debe ser un objeto`);
    return null;
  }

  for (const key of unknownKeys(raw, ANIMATION_KEYS)) {
    errors.push(`${at}: propiedad desconocida "${key}"`);
  }

  if (!isKey(raw.key)) {
    errors.push(`${at}.key: clave inválida`);
    return null;
  }

  const framesCount = asInt(raw.framesCount);
  const fps = asInt(raw.fps);
  const row = asInt(raw.row ?? 0);
  const startCol = asInt(raw.startCol ?? 0);

  if (framesCount === null || framesCount < 1) {
    errors.push(`${at}.framesCount: debe ser >= 1`);
  } else if (framesCount > L.maxFramesPerAnimation) {
    errors.push(`${at}.framesCount: máximo ${L.maxFramesPerAnimation} frames`);
  }
  if (fps === null || fps < L.minFps || fps > L.maxFps) {
    errors.push(`${at}.fps: debe estar entre ${L.minFps} y ${L.maxFps}`);
  }
  if (row === null || row < 0) errors.push(`${at}.row: debe ser >= 0`);
  if (startCol === null || startCol < 0) errors.push(`${at}.startCol: debe ser >= 0`);
  if (typeof raw.loop !== 'boolean') errors.push(`${at}.loop: debe ser booleano`);
  if (raw.directional !== undefined && typeof raw.directional !== 'boolean') {
    errors.push(`${at}.directional: debe ser booleano`);
  }
  if (
    raw.spriteSheetUrl !== undefined &&
    raw.spriteSheetUrl !== null &&
    typeof raw.spriteSheetUrl !== 'string'
  ) {
    errors.push(`${at}.spriteSheetUrl: debe ser texto o null`);
  }

  if (
    framesCount === null ||
    framesCount < 1 ||
    framesCount > L.maxFramesPerAnimation ||
    fps === null ||
    fps < L.minFps ||
    fps > L.maxFps ||
    row === null ||
    row < 0 ||
    startCol === null ||
    startCol < 0
  ) {
    return null;
  }

  return {
    key: raw.key,
    row,
    startCol,
    framesCount,
    fps,
    loop: raw.loop === true,
    directional: raw.directional !== false,
    spriteSheetUrl: typeof raw.spriteSheetUrl === 'string' ? raw.spriteSheetUrl : null,
  };
}

function parseState(raw: unknown, index: number, errors: string[]): WorldObjectState | null {
  const at = `states[${index}]`;
  if (!isPlainObject(raw)) {
    errors.push(`${at}: debe ser un objeto`);
    return null;
  }

  for (const key of unknownKeys(raw, STATE_KEYS)) {
    errors.push(`${at}: propiedad desconocida "${key}"`);
  }

  if (!isKey(raw.key)) {
    errors.push(`${at}.key: clave inválida`);
    return null;
  }

  let animation: string | null = null;
  if (raw.animation !== undefined && raw.animation !== null) {
    if (!isKey(raw.animation)) {
      errors.push(`${at}.animation: clave inválida`);
    } else {
      animation = raw.animation;
    }
  }

  return { key: raw.key, animation };
}

function parseCompletion(raw: unknown, at: string, errors: string[]): WorldCompletion | null {
  // Omitir onComplete es válido y significa "no pasa nada al terminar".
  if (raw === undefined || raw === null) return { action: 'NONE' };

  if (!isPlainObject(raw)) {
    errors.push(`${at}: debe ser un objeto`);
    return null;
  }

  for (const key of unknownKeys(raw, COMPLETION_KEYS)) {
    errors.push(`${at}: propiedad desconocida "${key}"`);
  }

  const action = raw.action;
  if (
    typeof action !== 'string' ||
    !(WORLD_COMPLETION_ACTIONS as readonly string[]).includes(action)
  ) {
    errors.push(`${at}.action: debe ser una de ${WORLD_COMPLETION_ACTIONS.join(' | ')}`);
    return null;
  }

  if (action === 'SET_STATE') {
    if (!isKey(raw.state)) {
      errors.push(`${at}.state: clave inválida`);
      return null;
    }
    return { action: 'SET_STATE', state: raw.state };
  }

  if (raw.state !== undefined) {
    errors.push(`${at}.state: sólo aplica con action SET_STATE`);
  }

  return action === 'REPEAT' ? { action: 'REPEAT' } : { action: 'NONE' };
}

function parseTransition(raw: unknown, index: number, errors: string[]): WorldTransition | null {
  const at = `transitions[${index}]`;
  if (!isPlainObject(raw)) {
    errors.push(`${at}: debe ser un objeto`);
    return null;
  }

  for (const key of unknownKeys(raw, TRANSITION_KEYS)) {
    errors.push(`${at}: propiedad desconocida "${key}"`);
  }

  const trigger = raw.trigger;
  if (typeof trigger !== 'string' || !(WORLD_TRIGGERS as readonly string[]).includes(trigger)) {
    errors.push(`${at}.trigger: debe ser una de ${WORLD_TRIGGERS.join(' | ')}`);
    return null;
  }
  if (!IMPLEMENTED_TRIGGERS.includes(trigger as WorldTrigger)) {
    errors.push(`${at}.trigger: "${trigger}" todavía no está implementado`);
    return null;
  }

  if (!isKey(raw.fromState)) {
    errors.push(`${at}.fromState: clave inválida`);
    return null;
  }

  const action = raw.action;
  if (typeof action !== 'string' || !(WORLD_ACTIONS as readonly string[]).includes(action)) {
    errors.push(`${at}.action: debe ser una de ${WORLD_ACTIONS.join(' | ')}`);
    return null;
  }

  if (action === 'SET_STATE') {
    if (!isKey(raw.state)) {
      errors.push(`${at}.state: clave inválida`);
      return null;
    }
    if (raw.animation !== undefined) {
      errors.push(`${at}.animation: sólo aplica con action PLAY_ANIMATION`);
    }
    if (raw.onComplete !== undefined) {
      errors.push(`${at}.onComplete: sólo aplica con action PLAY_ANIMATION`);
    }
    return {
      trigger: trigger as WorldTrigger,
      fromState: raw.fromState,
      action: 'SET_STATE',
      state: raw.state,
    };
  }

  if (!isKey(raw.animation)) {
    errors.push(`${at}.animation: clave inválida`);
    return null;
  }
  if (raw.state !== undefined) {
    errors.push(`${at}.state: con PLAY_ANIMATION el estado va en onComplete`);
  }

  const onComplete = parseCompletion(raw.onComplete, `${at}.onComplete`, errors);
  if (!onComplete) return null;

  return {
    trigger: trigger as WorldTrigger,
    fromState: raw.fromState,
    action: 'PLAY_ANIMATION',
    animation: raw.animation,
    onComplete,
  };
}

/**
 * Validación ESTRICTA para el camino de escritura (creator / admin /
 * marketplace). Un solo error ⇒ no se guarda nada.
 *
 * `null` y `undefined` son válidos y significan "objeto sin behavior"
 * (estático): devuelve `ok: false` con CERO errores, que es justo lo que
 * distingue "no hay behavior" de "el behavior está mal".
 */
export function validateBehavior(input: unknown): ValidationResult {
  if (input === null || input === undefined) {
    return { ok: false, behavior: null, errors: [] };
  }

  const errors: string[] = [];

  if (!isPlainObject(input)) {
    return { ok: false, behavior: null, errors: ['behavior: debe ser un objeto o null'] };
  }

  for (const key of unknownKeys(input, BEHAVIOR_KEYS)) {
    errors.push(`behavior: propiedad desconocida "${key}"`);
  }

  if (input.version !== 1) {
    errors.push('behavior.version: debe ser 1');
  }

  // ── animaciones ──
  const rawAnimations = Array.isArray(input.animations) ? input.animations : null;
  if (!rawAnimations) errors.push('behavior.animations: debe ser un array');
  if (rawAnimations && rawAnimations.length > L.maxAnimations) {
    errors.push(`behavior.animations: máximo ${L.maxAnimations}`);
  }
  const animations: WorldAnimation[] = [];
  const animationKeys = new Set<string>();
  (rawAnimations ?? []).forEach((raw, index) => {
    const parsed = parseAnimation(raw, index, errors);
    if (!parsed) return;
    if (animationKeys.has(parsed.key)) {
      errors.push(`animations[${index}].key: "${parsed.key}" duplicada`);
      return;
    }
    animationKeys.add(parsed.key);
    animations.push(parsed);
  });

  // ── estados ──
  const rawStates = Array.isArray(input.states) ? input.states : null;
  if (!rawStates) errors.push('behavior.states: debe ser un array');
  if (rawStates && rawStates.length === 0) {
    errors.push('behavior.states: se necesita al menos un estado');
  }
  if (rawStates && rawStates.length > L.maxStates) {
    errors.push(`behavior.states: máximo ${L.maxStates}`);
  }
  const states: WorldObjectState[] = [];
  const stateKeys = new Set<string>();
  (rawStates ?? []).forEach((raw, index) => {
    const parsed = parseState(raw, index, errors);
    if (!parsed) return;
    if (stateKeys.has(parsed.key)) {
      errors.push(`states[${index}].key: "${parsed.key}" duplicada`);
      return;
    }
    if (parsed.animation && !animationKeys.has(parsed.animation)) {
      errors.push(`states[${index}].animation: "${parsed.animation}" no existe`);
    }
    stateKeys.add(parsed.key);
    states.push(parsed);
  });

  // ── transiciones ──
  const rawTransitions = Array.isArray(input.transitions) ? input.transitions : null;
  if (!rawTransitions) errors.push('behavior.transitions: debe ser un array');
  if (rawTransitions && rawTransitions.length > L.maxTransitions) {
    errors.push(`behavior.transitions: máximo ${L.maxTransitions}`);
  }
  const transitions: WorldTransition[] = [];
  const seenPairs = new Set<string>();
  (rawTransitions ?? []).forEach((raw, index) => {
    const parsed = parseTransition(raw, index, errors);
    if (!parsed) return;

    // Dos transiciones para el mismo (trigger, fromState) harían que el
    // resultado dependa del orden del array — ambiguo por definición.
    const pair = `${parsed.trigger}:${parsed.fromState}`;
    if (seenPairs.has(pair)) {
      errors.push(`transitions[${index}]: ya hay una transición para ${pair}`);
      return;
    }
    seenPairs.add(pair);

    if (!stateKeys.has(parsed.fromState)) {
      errors.push(`transitions[${index}].fromState: "${parsed.fromState}" no existe`);
    }
    if (parsed.action === 'SET_STATE' && !stateKeys.has(parsed.state)) {
      errors.push(`transitions[${index}].state: "${parsed.state}" no existe`);
    }
    if (parsed.action === 'PLAY_ANIMATION') {
      if (!animationKeys.has(parsed.animation)) {
        errors.push(`transitions[${index}].animation: "${parsed.animation}" no existe`);
      }
      if (parsed.onComplete.action === 'SET_STATE' && !stateKeys.has(parsed.onComplete.state)) {
        errors.push(
          `transitions[${index}].onComplete.state: "${parsed.onComplete.state}" no existe`,
        );
      }
      // Una animación en loop nunca emite "completed", así que un
      // onComplete SET_STATE ahí sería letra muerta: el objeto se quedaría
      // colgado en la transición para siempre. Mejor decirlo al guardar que
      // dejar al creador preguntándose por qué su puerta no abre.
      const animation = animations.find((item) => item.key === parsed.animation);
      if (animation?.loop && parsed.onComplete.action === 'SET_STATE') {
        errors.push(
          `transitions[${index}]: "${parsed.animation}" es loop y nunca termina, ` +
            'no puede tener onComplete SET_STATE',
        );
      }
    }
    transitions.push(parsed);
  });

  // ── estado inicial ──
  if (!isKey(input.initialState)) {
    errors.push('behavior.initialState: clave inválida');
  } else if (!stateKeys.has(input.initialState)) {
    errors.push(`behavior.initialState: "${input.initialState}" no existe en states`);
  }

  if (errors.length > 0) return { ok: false, behavior: null, errors };

  return {
    ok: true,
    errors: [],
    behavior: {
      version: 1,
      initialState: input.initialState as string,
      states,
      animations,
      transitions,
    },
  };
}

/**
 * Lectura DEFENSIVA para el camino de render (juego y preview). Nunca lanza
 * y nunca devuelve algo a medio armar: o un behavior coherente, o null —
 * que significa "tratalo como el objeto estático que era antes".
 *
 * Cuando falla, el objeto no se rompe: se dibuja como siempre.
 */
export function readBehavior(input: unknown): WorldBehavior | null {
  try {
    const result = validateBehavior(input);
    if (result.ok) return result.behavior;
    return repairBehavior(input);
  } catch {
    return null;
  }
}

/**
 * Último recurso del lector: se queda con las piezas que SÍ son válidas y
 * descarta las que apuntan a algo que no existe (una animación borrada en
 * una versión nueva del objeto, una transición hacia un estado eliminado).
 * Si tras la poda no queda ni un estado, devuelve null.
 *
 * No reescribe lo persistido — igual que `resolveOrigin()`, sólo decide cómo
 * LEER un dato inconsistente.
 */
function repairBehavior(input: unknown): WorldBehavior | null {
  if (!isPlainObject(input)) return null;

  // Los errores del parseo individual se descartan a propósito: acá no se
  // reporta nada, se poda.
  const discard: string[] = [];

  const animations: WorldAnimation[] = [];
  const animationKeys = new Set<string>();
  if (Array.isArray(input.animations)) {
    for (const raw of input.animations.slice(0, L.maxAnimations)) {
      const parsed = parseAnimation(raw, 0, discard);
      if (parsed && !animationKeys.has(parsed.key)) {
        animationKeys.add(parsed.key);
        animations.push(parsed);
      }
    }
  }

  const states: WorldObjectState[] = [];
  const stateKeys = new Set<string>();
  if (Array.isArray(input.states)) {
    for (const raw of input.states.slice(0, L.maxStates)) {
      const parsed = parseState(raw, 0, discard);
      if (!parsed || stateKeys.has(parsed.key)) continue;
      stateKeys.add(parsed.key);
      states.push({
        key: parsed.key,
        // Animación que ya no existe ⇒ estado quieto, no estado roto.
        animation:
          parsed.animation && animationKeys.has(parsed.animation) ? parsed.animation : null,
      });
    }
  }

  if (states.length === 0) return null;

  const transitions: WorldTransition[] = [];
  const seenPairs = new Set<string>();
  if (Array.isArray(input.transitions)) {
    for (const raw of input.transitions.slice(0, L.maxTransitions)) {
      const parsed = parseTransition(raw, 0, discard);
      if (!parsed) continue;

      const pair = `${parsed.trigger}:${parsed.fromState}`;
      if (seenPairs.has(pair)) continue;
      if (!stateKeys.has(parsed.fromState)) continue;

      if (parsed.action === 'SET_STATE') {
        if (!stateKeys.has(parsed.state)) continue;
      } else {
        if (!animationKeys.has(parsed.animation)) continue;
        if (parsed.onComplete.action === 'SET_STATE' && !stateKeys.has(parsed.onComplete.state)) {
          continue;
        }
      }

      seenPairs.add(pair);
      transitions.push(parsed);
    }
  }

  const initialState =
    isKey(input.initialState) && stateKeys.has(input.initialState)
      ? input.initialState
      : states[0].key;

  return { version: 1, initialState, states, animations, transitions };
}
