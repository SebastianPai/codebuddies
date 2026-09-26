/**
 * Modelo de EDICIÓN del comportamiento de un world object.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ EXISTE UN "DRAFT" Y NO SE EDITA WorldBehavior DIRECTAMENTE
 *
 * `WorldBehavior` es el contrato VÁLIDO. Mientras alguien edita, el dato está
 * a medias casi todo el tiempo: un estado recién agregado no tiene nombre, una
 * animación está subiéndose y todavía no tiene atlas, una transición apunta a
 * un estado que se va a renombrar. Forzar esos momentos dentro del contrato
 * obligaría a relajarlo, que es justo lo que no queremos.
 *
 * Así que el draft es el estado del formulario, y `draftToBehavior()` es la
 * única puerta que lo convierte en contrato. La validación definitiva NO se
 * reimplementa acá: se delega en `validateBehavior()` del paquete compartido,
 * el mismo que usa la API al guardar y el mismo cuyo resultado ejecuta el
 * juego. Si esto tuviera sus propias reglas, tarde o temprano dirían cosas
 * distintas.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SIN REACT
 *
 * Este módulo es TypeScript puro a propósito: `apps/web` no tiene runner de
 * tests ni React Testing Library, así que toda la lógica vive acá y se prueba
 * con el Jest que ya existe en `apps/api`. El componente queda como una capa
 * de render fina sobre estas funciones.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * IDs DE FILA
 *
 * Cada fila lleva un `id` que NO es su clave. La clave (`key`) es lo que el
 * creador escribe y puede cambiar mientras teclea; usarla como identidad haría
 * que React reconstruyera el input y se perdiera el foco a cada letra.
 */

import {
  describeBehaviorKind,
  validateBehavior,
  WORLD_OBJECT_LIMITS as LIMITS,
  type WorldAnimation,
  type WorldBehavior,
  type WorldCompletion,
  type WorldObjectKindLabel,
  type WorldTransition,
} from "@codebuddies/world-objects";

export { LIMITS as BEHAVIOR_LIMITS };

/**
 * Único trigger que esta fase expone. El contrato declara más, pero la UI no
 * los ofrece todavía y el validador tampoco los acepta.
 */
export const EDITOR_TRIGGER = "CLICK" as const;

export type DraftCompletionAction = WorldCompletion["action"];

export type DraftAnimation = {
  id: string;
  key: string;
  fps: number;
  loop: boolean;
  directional: boolean;
  spriteSheetUrl: string | null;
  /** Los tres salen del generador de atlas, no se escriben a mano. */
  row: number;
  startCol: number;
  framesCount: number;
};

export type DraftState = {
  id: string;
  key: string;
  /** Animación que corre mientras dura el estado. null = pose quieta. */
  animation: string | null;
};

export type DraftTransition = {
  id: string;
  trigger: typeof EDITOR_TRIGGER;
  fromState: string;
  action: "PLAY_ANIMATION" | "SET_STATE";
  /** Sólo con PLAY_ANIMATION. */
  animation: string | null;
  /** Sólo con PLAY_ANIMATION. */
  onComplete: DraftCompletionAction;
  /**
   * Estado destino. Sirve para las dos acciones — con SET_STATE es el destino
   * directo, con PLAY_ANIMATION es el del `onComplete`. Unificarlo evita al
   * creador dos campos que significan lo mismo.
   */
  targetState: string | null;
};

export type BehaviorDraft = {
  /** false ⇒ el objeto se guarda con `behavior = null` (estático). */
  enabled: boolean;
  initialState: string;
  states: DraftState[];
  animations: DraftAnimation[];
  transitions: DraftTransition[];
};

// ─────────────────────────────── ids ───────────────────────────────

let idCounter = 0;

/** Id de fila, sólo para React. No viaja al contrato. */
export function nextRowId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// ────────────────────────── construcción ──────────────────────────

export function createEmptyDraft(): BehaviorDraft {
  return {
    enabled: false,
    initialState: "",
    states: [],
    animations: [],
    transitions: [],
  };
}

/**
 * Arranca un comportamiento nuevo con lo mínimo que tiene sentido: un estado
 * llamado IDLE que además es el inicial. Sin esto, activar el interruptor
 * dejaría un formulario vacío que ya está en error.
 */
export function createStarterDraft(): BehaviorDraft {
  const state: DraftState = { id: nextRowId("state"), key: "IDLE", animation: null };
  return {
    enabled: true,
    initialState: state.key,
    states: [state],
    animations: [],
    transitions: [],
  };
}

/**
 * Draft a partir de lo que llega del backend.
 *
 * Se lee con `validateBehavior()` en vez de confiar en la forma cruda: si lo
 * guardado es inválido (editado a mano, de una versión vieja), el editor
 * arranca vacío en lugar de mostrar campos a medias.
 */
export function draftFromBehavior(raw: unknown): BehaviorDraft {
  if (raw === null || raw === undefined) return createEmptyDraft();

  const result = validateBehavior(raw);
  if (!result.ok || !result.behavior) return createEmptyDraft();

  const behavior = result.behavior;

  return {
    enabled: true,
    initialState: behavior.initialState,
    states: behavior.states.map((state) => ({
      id: nextRowId("state"),
      key: state.key,
      animation: state.animation,
    })),
    animations: behavior.animations.map((animation) => ({
      id: nextRowId("anim"),
      key: animation.key,
      fps: animation.fps,
      loop: animation.loop,
      directional: animation.directional,
      spriteSheetUrl: animation.spriteSheetUrl,
      row: animation.row,
      startCol: animation.startCol,
      framesCount: animation.framesCount,
    })),
    transitions: behavior.transitions.map((transition) => toDraftTransition(transition)),
  };
}

function toDraftTransition(transition: WorldTransition): DraftTransition {
  if (transition.action === "SET_STATE") {
    return {
      id: nextRowId("tr"),
      trigger: EDITOR_TRIGGER,
      fromState: transition.fromState,
      action: "SET_STATE",
      animation: null,
      onComplete: "NONE",
      targetState: transition.state,
    };
  }

  return {
    id: nextRowId("tr"),
    trigger: EDITOR_TRIGGER,
    fromState: transition.fromState,
    action: "PLAY_ANIMATION",
    animation: transition.animation,
    onComplete: transition.onComplete.action,
    targetState:
      transition.onComplete.action === "SET_STATE" ? transition.onComplete.state : null,
  };
}

/** Plantilla a partir de un behavior de referencia del paquete. */
export function draftFromTemplate(template: WorldBehavior): BehaviorDraft {
  return draftFromBehavior(template);
}

// ──────────────────────── conversión al contrato ────────────────────────

/**
 * Draft → `WorldBehavior`. Puede devolver algo que no pase la validación: el
 * que decide si se guarda es `validateDraft()`.
 */
export function draftToBehavior(draft: BehaviorDraft): WorldBehavior {
  return {
    version: 1,
    initialState: draft.initialState.trim(),
    states: draft.states.map((state) => ({
      key: state.key.trim(),
      animation: state.animation ? state.animation.trim() : null,
    })),
    animations: draft.animations.map(
      (animation): WorldAnimation => ({
        key: animation.key.trim(),
        row: animation.row,
        startCol: animation.startCol,
        framesCount: animation.framesCount,
        fps: animation.fps,
        loop: animation.loop,
        directional: animation.directional,
        spriteSheetUrl: animation.spriteSheetUrl,
      }),
    ),
    transitions: draft.transitions.map((transition) => toContractTransition(transition)),
  };
}

function toContractTransition(transition: DraftTransition): WorldTransition {
  if (transition.action === "SET_STATE") {
    return {
      trigger: transition.trigger,
      fromState: transition.fromState.trim(),
      action: "SET_STATE",
      state: (transition.targetState ?? "").trim(),
    };
  }

  const onComplete: WorldCompletion =
    transition.onComplete === "SET_STATE"
      ? { action: "SET_STATE", state: (transition.targetState ?? "").trim() }
      : { action: transition.onComplete };

  return {
    trigger: transition.trigger,
    fromState: transition.fromState.trim(),
    action: "PLAY_ANIMATION",
    animation: (transition.animation ?? "").trim(),
    onComplete,
  };
}

export type DraftValidation = { ok: boolean; errors: string[] };

/**
 * Validación definitiva. Delega en el paquete compartido — acá no se
 * reimplementa ni una sola regla.
 */
export function validateDraft(draft: BehaviorDraft): DraftValidation {
  if (!draft.enabled) return { ok: true, errors: [] };

  const result = validateBehavior(draftToBehavior(draft));
  return { ok: result.ok, errors: result.errors };
}

/**
 * Qué mandar al backend.
 *
 * Los tres valores significan cosas distintas y no se pueden confundir (misma
 * semántica que `buildBehaviorData` en la API):
 *
 *   undefined → no tocar la columna. Es el caso de un objeto que nunca tuvo
 *               comportamiento y sigue sin tenerlo: escribir null ahí sería
 *               un cambio inventado.
 *   null      → borrarlo. El creador apagó el interruptor de un objeto que SÍ
 *               tenía comportamiento.
 *   objeto    → guardarlo.
 */
export function draftToPayload(
  draft: BehaviorDraft,
  hadBehavior: boolean,
): WorldBehavior | null | undefined {
  if (draft.enabled) return draftToBehavior(draft);
  return hadBehavior ? null : undefined;
}

/** STATIC / ANIMATED / INTERACTIVE, con la utilidad que ya existe. */
export function draftKind(draft: BehaviorDraft): WorldObjectKindLabel {
  if (!draft.enabled) return "STATIC";

  const result = validateBehavior(draftToBehavior(draft));
  if (result.ok && result.behavior) return describeBehaviorKind(result.behavior);

  // Todavía inválido mientras se edita: se clasifica por lo que hay.
  if (draft.transitions.length > 0) return "INTERACTIVE";
  if (draft.animations.length > 0) return "ANIMATED";
  return "STATIC";
}

// ──────────────────────────── mutadores ────────────────────────────

/** Nombre libre del tipo `base`, `base_2`, `base_3`… */
export function uniqueKey(taken: string[], base: string): string {
  const used = new Set(taken.map((key) => key.trim()));
  if (!used.has(base)) return base;

  let index = 2;
  while (used.has(`${base}_${index}`)) index += 1;
  return `${base}_${index}`;
}

export function addState(draft: BehaviorDraft): BehaviorDraft {
  if (draft.states.length >= LIMITS.maxStates) return draft;

  const state: DraftState = {
    id: nextRowId("state"),
    key: uniqueKey(draft.states.map((item) => item.key), "ESTADO"),
    animation: null,
  };

  return {
    ...draft,
    states: [...draft.states, state],
    // El primer estado que se agrega pasa a ser el inicial: sin estado inicial
    // el behavior no es válido, y hacérselo elegir a mano sería un paso extra
    // sin decisión real.
    initialState: draft.states.length === 0 ? state.key : draft.initialState,
  };
}

/**
 * Renombrar un estado arrastra TODAS sus referencias: el estado inicial y las
 * transiciones que lo usan como origen o destino. Si no, cambiarle el nombre a
 * un estado rompería en silencio el comportamiento entero.
 */
export function updateState(
  draft: BehaviorDraft,
  id: string,
  patch: Partial<Omit<DraftState, "id">>,
): BehaviorDraft {
  const current = draft.states.find((state) => state.id === id);
  if (!current) return draft;

  const next = { ...current, ...patch };
  const renamedFrom = current.key;
  const renamedTo = next.key;
  const renamed = renamedFrom !== renamedTo;

  const rename = (key: string) => (renamed && key === renamedFrom ? renamedTo : key);

  return {
    ...draft,
    states: draft.states.map((state) => (state.id === id ? next : state)),
    initialState: renamed ? rename(draft.initialState) : draft.initialState,
    transitions: renamed
      ? draft.transitions.map((transition) => ({
          ...transition,
          fromState: rename(transition.fromState),
          targetState: transition.targetState ? rename(transition.targetState) : null,
        }))
      : draft.transitions,
  };
}

/**
 * Borrar un estado se lleva las transiciones que salían de él o llevaban a él:
 * dejarlas apuntando al vacío sólo produciría errores de validación que el
 * creador no sabría interpretar.
 */
export function removeState(draft: BehaviorDraft, id: string): BehaviorDraft {
  const target = draft.states.find((state) => state.id === id);
  if (!target) return draft;

  const states = draft.states.filter((state) => state.id !== id);
  const transitions = draft.transitions.filter(
    (transition) =>
      transition.fromState !== target.key && transition.targetState !== target.key,
  );

  return {
    ...draft,
    states,
    transitions,
    initialState:
      draft.initialState === target.key ? (states[0]?.key ?? "") : draft.initialState,
  };
}

export function addAnimation(draft: BehaviorDraft): BehaviorDraft {
  if (draft.animations.length >= LIMITS.maxAnimations) return draft;

  const animation: DraftAnimation = {
    id: nextRowId("anim"),
    key: uniqueKey(draft.animations.map((item) => item.key), "animacion"),
    fps: 12,
    loop: false,
    directional: false,
    spriteSheetUrl: null,
    row: 0,
    startCol: 0,
    framesCount: 1,
  };

  return { ...draft, animations: [...draft.animations, animation] };
}

/**
 * Cambiar una animación arrastra sus referencias igual que un estado, y además
 * repara una combinación que el contrato prohíbe:
 *
 *   una animación en LOOP nunca termina, así que "al terminar, ir a estado"
 *   no se dispararía jamás y el objeto quedaría colgado en la transición.
 *
 * Cuando el creador marca `loop`, las transiciones que la usaban con "ir a
 * estado" pasan a "no hacer nada". Es visible en pantalla y evita guardar algo
 * que el validador rechazaría sin que se entienda por qué.
 */
export function updateAnimation(
  draft: BehaviorDraft,
  id: string,
  patch: Partial<Omit<DraftAnimation, "id">>,
): BehaviorDraft {
  const current = draft.animations.find((animation) => animation.id === id);
  if (!current) return draft;

  const next = { ...current, ...patch };
  const renamed = current.key !== next.key;
  const rename = (key: string | null) =>
    renamed && key === current.key ? next.key : key;

  const becameLoop = !current.loop && next.loop;

  return {
    ...draft,
    animations: draft.animations.map((animation) =>
      animation.id === id ? next : animation,
    ),
    states: renamed
      ? draft.states.map((state) => ({ ...state, animation: rename(state.animation) }))
      : draft.states,
    transitions: draft.transitions.map((transition) => {
      const animation = rename(transition.animation);
      const usesThis = animation === next.key;

      if (becameLoop && usesThis && transition.onComplete === "SET_STATE") {
        return { ...transition, animation, onComplete: "NONE", targetState: null };
      }
      return animation === transition.animation ? transition : { ...transition, animation };
    }),
  };
}

/** Borrar una animación limpia las referencias que quedaban apuntándola. */
export function removeAnimation(draft: BehaviorDraft, id: string): BehaviorDraft {
  const target = draft.animations.find((animation) => animation.id === id);
  if (!target) return draft;

  return {
    ...draft,
    animations: draft.animations.filter((animation) => animation.id !== id),
    states: draft.states.map((state) =>
      state.animation === target.key ? { ...state, animation: null } : state,
    ),
    transitions: draft.transitions.filter(
      (transition) => transition.animation !== target.key,
    ),
  };
}

export function addTransition(draft: BehaviorDraft): BehaviorDraft {
  if (draft.transitions.length >= LIMITS.maxTransitions) return draft;

  // Se propone el primer estado que todavía no tenga una transición de click:
  // dos transiciones para el mismo par (trigger, estado) son ambiguas y el
  // contrato las rechaza.
  const used = new Set(draft.transitions.map((transition) => transition.fromState));
  const fromState =
    draft.states.find((state) => !used.has(state.key))?.key ??
    draft.states[0]?.key ??
    "";

  const transition: DraftTransition = {
    id: nextRowId("tr"),
    trigger: EDITOR_TRIGGER,
    fromState,
    action: "PLAY_ANIMATION",
    animation: draft.animations[0]?.key ?? null,
    onComplete: "SET_STATE",
    targetState: draft.states.find((state) => state.key !== fromState)?.key ?? null,
  };

  return { ...draft, transitions: [...draft.transitions, transition] };
}

export function updateTransition(
  draft: BehaviorDraft,
  id: string,
  patch: Partial<Omit<DraftTransition, "id" | "trigger">>,
): BehaviorDraft {
  return {
    ...draft,
    transitions: draft.transitions.map((transition) => {
      if (transition.id !== id) return transition;

      const next = { ...transition, ...patch };

      // Si la animación elegida es un bucle, "ir a estado" deja de ser una
      // opción posible (ver updateAnimation).
      if (next.action === "PLAY_ANIMATION" && next.onComplete === "SET_STATE") {
        const animation = draft.animations.find((item) => item.key === next.animation);
        if (animation?.loop) {
          return { ...next, onComplete: "NONE", targetState: null };
        }
      }

      return next;
    }),
  };
}

export function removeTransition(draft: BehaviorDraft, id: string): BehaviorDraft {
  return {
    ...draft,
    transitions: draft.transitions.filter((transition) => transition.id !== id),
  };
}

// ───────────────────────── ayudas para la UI ─────────────────────────

/**
 * Finales posibles para una transición según la animación elegida.
 *
 * Un bucle no ofrece "ir a estado": es la regla del contrato, expuesta como
 * opciones que no existen en vez de como un error después de guardar.
 */
export function availableCompletions(
  draft: BehaviorDraft,
  animationKey: string | null,
): DraftCompletionAction[] {
  const animation = draft.animations.find((item) => item.key === animationKey);
  if (animation?.loop) return ["REPEAT", "NONE"];
  return ["SET_STATE", "REPEAT", "NONE"];
}

/** ¿Hay ya una transición de click para ese estado? (el par debe ser único) */
export function hasTransitionFor(
  draft: BehaviorDraft,
  fromState: string,
  exceptId?: string,
): boolean {
  return draft.transitions.some(
    (transition) =>
      transition.id !== exceptId &&
      transition.trigger === EDITOR_TRIGGER &&
      transition.fromState === fromState,
  );
}
