/**
 * Lo que el editor le EXPLICA al creador sobre su comportamiento.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NO ES UNA SEGUNDA VALIDACIÓN
 *
 * La pregunta "¿esto es válido?" la responde `validateBehavior()` del paquete
 * compartido, y nada de acá la reimplementa: `readiness()` recibe esos mismos
 * errores y sólo los ORDENA y los UBICA. Lo que este módulo agrega es otra
 * pregunta, que el contrato no responde ni debe responder:
 *
 *   válido   → la API lo va a aceptar          (regla del contrato)
 *   listo    → en la sala se va a ver y se va a poder usar   (aviso de UX)
 *
 * Son cosas distintas a propósito. Una animación sin atlas es VÁLIDA —guardar
 * a medias tiene que poder hacerse— pero en el juego no se ve nada, y eso hay
 * que decirlo antes de publicar, no después. Todos los avisos de acá se
 * derivan de datos que ya existen en el draft; ninguno inventa una regla nueva
 * ni bloquea un guardado que el backend aceptaría.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DEVUELVE CÓDIGOS, NO FRASES
 *
 * Nada de texto en castellano acá: las funciones devuelven códigos y números,
 * y el componente los pasa por `t()`. Así la lógica se prueba sin i18n y las
 * tres traducciones no pueden quedar fuera de sincronía con el cálculo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SIN REACT
 *
 * Igual que `behavior-draft.ts` y `behavior-preview-state.ts`: `apps/web` no
 * tiene runner de tests, así que la lógica vive en TypeScript puro y se prueba
 * con el Jest de `apps/api`.
 */

import {
  resolveAtlasGeometry,
  WORLD_OBJECT_LIMITS as LIMITS,
  type AtlasGeometry,
  type WorldBehavior,
} from "@codebuddies/world-objects";

import {
  removeAnimation,
  removeState,
  validateDraft,
  type BehaviorDraft,
  type DraftAnimation,
  type DraftState,
  type DraftTransition,
} from "./behavior-draft";

// ═══════════════════════ ubicación de los errores ═══════════════════════

export type ErrorRowKind = "state" | "animation" | "transition";

export type ErrorLocation = {
  kind: ErrorRowKind | "general";
  /** Índice en el array del draft, o null si el error es del conjunto. */
  index: number | null;
};

/**
 * De qué fila habla un error del validador.
 *
 * El validador prefija sus mensajes con la ruta del dato
 * (`transitions[1].animation: …`), así que acá sólo se LEE ese prefijo. No se
 * interpreta el error ni se decide si algo es válido: eso ya está decidido.
 *
 * Los índices coinciden con los del draft porque `draftToBehavior()` mapea las
 * tres listas en orden, uno a uno.
 */
export function locateBehaviorError(message: string): ErrorLocation {
  const match = /^(states|animations|transitions)\[(\d+)\]/.exec(message);
  if (!match) return { kind: "general", index: null };

  const kind = (
    { states: "state", animations: "animation", transitions: "transition" } as const
  )[match[1] as "states" | "animations" | "transitions"];

  return { kind, index: Number(match[2]) };
}

export type GroupedErrors = {
  /** Errores del conjunto (estado inicial, límites, versión…). */
  general: string[];
  /** Por índice de fila. */
  states: Map<number, string[]>;
  animations: Map<number, string[]>;
  transitions: Map<number, string[]>;
};

/** Reparte los errores del validador entre las tarjetas que los provocan. */
export function groupBehaviorErrors(errors: string[]): GroupedErrors {
  const grouped: GroupedErrors = {
    general: [],
    states: new Map(),
    animations: new Map(),
    transitions: new Map(),
  };

  for (const error of errors) {
    const location = locateBehaviorError(error);
    if (location.kind === "general" || location.index === null) {
      grouped.general.push(error);
      continue;
    }

    const bucket =
      location.kind === "state"
        ? grouped.states
        : location.kind === "animation"
          ? grouped.animations
          : grouped.transitions;

    const list = bucket.get(location.index);
    if (list) list.push(error);
    else bucket.set(location.index, [error]);
  }

  return grouped;
}

/** Errores de UNA fila, buscada por su id (que es lo que tiene el componente). */
export function errorsForRow(
  draft: BehaviorDraft,
  grouped: GroupedErrors,
  kind: ErrorRowKind,
  id: string,
): string[] {
  const rows: Array<{ id: string }> =
    kind === "state"
      ? draft.states
      : kind === "animation"
        ? draft.animations
        : draft.transitions;

  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return [];

  const bucket =
    kind === "state"
      ? grouped.states
      : kind === "animation"
        ? grouped.animations
        : grouped.transitions;

  return bucket.get(index) ?? [];
}

// ═══════════════════════ qué pasa al hacer click ═══════════════════════

/**
 * El final de un click, en términos de lo que el creador ve pasar.
 *
 * Cada variante corresponde a una combinación que el contrato ya permite; acá
 * sólo se le pone nombre para poder explicarla en una frase.
 */
export type ClickOutcome =
  /** Va derecho a otro estado, sin animación de paso. */
  | { kind: "GO_TO"; state: string }
  /** Reproduce una animación y al terminar queda en otro estado. */
  | { kind: "PLAY_THEN_GO"; animation: string; state: string }
  /** Reproduce una animación y al terminar vuelve al estado de partida. */
  | { kind: "PLAY_THEN_BACK"; animation: string }
  /** Reproduce una animación que se repite indefinidamente. */
  | { kind: "PLAY_FOREVER"; animation: string }
  /** La transición existe pero está a medias (falta animación o destino). */
  | { kind: "INCOMPLETE" };

export function describeClickOutcome(transition: DraftTransition): ClickOutcome {
  if (transition.action === "SET_STATE") {
    return transition.targetState
      ? { kind: "GO_TO", state: transition.targetState }
      : { kind: "INCOMPLETE" };
  }

  if (!transition.animation) return { kind: "INCOMPLETE" };

  if (transition.onComplete === "SET_STATE") {
    return transition.targetState
      ? {
          kind: "PLAY_THEN_GO",
          animation: transition.animation,
          state: transition.targetState,
        }
      : { kind: "INCOMPLETE" };
  }

  if (transition.onComplete === "REPEAT") {
    return { kind: "PLAY_FOREVER", animation: transition.animation };
  }

  return { kind: "PLAY_THEN_BACK", animation: transition.animation };
}

/** La transición de click que sale de un estado, si la hay. */
export function transitionFromState(
  draft: BehaviorDraft,
  stateKey: string,
): DraftTransition | null {
  return (
    draft.transitions.find((transition) => transition.fromState === stateKey) ?? null
  );
}

// ═══════════════════════ tarjeta de un estado ═══════════════════════

export type StateCardInfo = {
  isInitial: boolean;
  /** Animación que corre mientras dura el estado. */
  animation: string | null;
  /** Qué pasa al hacer click. null = el objeto no reacciona en este estado. */
  onClick: ClickOutcome | null;
  /** Estados desde los que se puede llegar a este. */
  reachableFrom: string[];
  /** Se puede llegar acá alguna vez (es el inicial o alguien lleva a él). */
  reachable: boolean;
  /**
   * Callejón sin salida: se puede entrar y no hay ningún click que saque de
   * acá. Es válido para el contrato, pero en la sala el objeto se queda
   * trabado para siempre, así que se avisa.
   */
  deadEnd: boolean;
};

/**
 * Todo lo que la tarjeta de un estado necesita mostrar.
 *
 * El objetivo es que el creador no tenga que unir mentalmente dos listas: el
 * estado dice qué le pasa al hacer click, ahí mismo, sin bajar a la sección de
 * transiciones.
 */
export function describeStateCard(
  draft: BehaviorDraft,
  state: DraftState,
): StateCardInfo {
  const transition = transitionFromState(draft, state.key);

  const reachableFrom = draft.transitions
    .filter((item) => item.targetState === state.key && item.fromState !== state.key)
    .map((item) => item.fromState);

  const isInitial = draft.initialState === state.key;

  // "Sin salida" sólo tiene sentido en un objeto que reacciona al click: si
  // NADA del objeto reacciona, es un objeto animado y está perfecto así.
  const interactive = draft.transitions.length > 0;

  return {
    isInitial,
    animation: state.animation,
    onClick: transition ? describeClickOutcome(transition) : null,
    reachableFrom: [...new Set(reachableFrom)],
    reachable: isInitial || reachableFrom.length > 0,
    deadEnd: interactive && !transition,
  };
}

// ═══════════════════════ avisos y "listo para publicar" ═══════════════════════

export type NoticeCode =
  /** Animación sin atlas: válida, pero en la sala no se ve nada. */
  | "ANIMATION_WITHOUT_SPRITE"
  /** Un solo frame: no se va a mover. */
  | "ANIMATION_SINGLE_FRAME"
  /** Nadie la usa: ni un estado ni una transición. */
  | "ANIMATION_UNUSED"
  /** Se puede entrar al estado y ningún click saca de ahí. */
  | "STATE_DEAD_END"
  /** No es el inicial y nada lleva a él: en la sala nunca se va a ver. */
  | "STATE_UNREACHABLE"
  /** Hay animaciones pero nada reacciona al click. */
  | "NO_INTERACTION"
  /** El comportamiento está activado y no hay ni una animación. */
  | "NO_ANIMATION";

export type Notice = {
  code: NoticeCode;
  /** Fila a la que apunta el aviso, para poder marcarla. */
  row: { kind: ErrorRowKind; id: string; key: string } | null;
};

/** Avisos que impiden decir "listo": el objeto no se vería bien en la sala. */
const BLOCKING_NOTICES: ReadonlySet<NoticeCode> = new Set<NoticeCode>([
  "ANIMATION_WITHOUT_SPRITE",
  "STATE_DEAD_END",
  "STATE_UNREACHABLE",
]);

export function isBlockingNotice(code: NoticeCode): boolean {
  return BLOCKING_NOTICES.has(code);
}

/**
 * ¿Alguien usa esta animación? Puede usarla un estado (mientras dura) o una
 * transición (como animación de paso).
 */
function animationIsUsed(draft: BehaviorDraft, animation: DraftAnimation): boolean {
  return (
    draft.states.some((state) => state.animation === animation.key) ||
    draft.transitions.some((transition) => transition.animation === animation.key)
  );
}

/** Todos los avisos del draft, en el orden en que conviene leerlos. */
export function collectNotices(draft: BehaviorDraft): Notice[] {
  if (!draft.enabled) return [];

  const notices: Notice[] = [];

  for (const animation of draft.animations) {
    const row = { kind: "animation" as const, id: animation.id, key: animation.key };

    if (!animation.spriteSheetUrl) {
      notices.push({ code: "ANIMATION_WITHOUT_SPRITE", row });
    } else if (animation.framesCount <= 1) {
      // Con atlas y un solo frame: es una pose, no una animación. Sin atlas no
      // se dice nada todavía, porque el `framesCount` sale justamente de subirlo.
      notices.push({ code: "ANIMATION_SINGLE_FRAME", row });
    }

    if (!animationIsUsed(draft, animation)) {
      notices.push({ code: "ANIMATION_UNUSED", row });
    }
  }

  for (const state of draft.states) {
    const info = describeStateCard(draft, state);
    const row = { kind: "state" as const, id: state.id, key: state.key };

    if (!info.reachable) notices.push({ code: "STATE_UNREACHABLE", row });
    if (info.deadEnd) notices.push({ code: "STATE_DEAD_END", row });
  }

  if (draft.animations.length === 0) {
    notices.push({ code: "NO_ANIMATION", row: null });
  } else if (draft.transitions.length === 0) {
    notices.push({ code: "NO_INTERACTION", row: null });
  }

  return notices;
}

export type ChecklistCode =
  /** Hay al menos un estado. */
  | "STATES"
  /** Todas las animaciones tienen sus frames subidos. */
  | "SPRITES"
  /** Algo reacciona al click. Opcional: un objeto sólo animado es legítimo. */
  | "INTERACTION"
  /** El validador compartido lo acepta. */
  | "VALID";

export type ChecklistItem = {
  code: ChecklistCode;
  done: boolean;
  /** No hace falta para publicar; es una capacidad más, no un requisito. */
  optional: boolean;
};

export type ReadinessLevel =
  /** Objeto estático: no hay nada que revisar. */
  | "STATIC"
  /** El validador compartido lo rechaza: no se puede guardar. */
  | "INVALID"
  /** Se puede guardar, pero en la sala no se vería/usaría bien. */
  | "INCOMPLETE"
  /** Se puede guardar y se va a ver y usar como se diseñó. */
  | "READY";

export type Readiness = {
  level: ReadinessLevel;
  /** Los errores del validador compartido, tal cual. */
  errors: string[];
  grouped: GroupedErrors;
  notices: Notice[];
  /** Avisos que impiden el "listo", ya filtrados. */
  blocking: Notice[];
  checklist: ChecklistItem[];
};

/**
 * El semáforo del editor.
 *
 * `errors` viene íntegro de `validateDraft()` → `validateBehavior()`: es la
 * MISMA verdad que va a aplicar la API. Lo único que se agrega es el nivel
 * INCOMPLETE, que no existe en el contrato porque el contrato no tiene por qué
 * opinar sobre si un atlas ya se subió.
 */
export function readiness(draft: BehaviorDraft): Readiness {
  const validation = validateDraft(draft);
  const grouped = groupBehaviorErrors(validation.errors);
  const notices = collectNotices(draft);
  const blocking = notices.filter((notice) => isBlockingNotice(notice.code));

  const checklist: ChecklistItem[] = [
    { code: "STATES", done: draft.states.length > 0, optional: false },
    {
      code: "SPRITES",
      done:
        draft.animations.length > 0 &&
        draft.animations.every((animation) => Boolean(animation.spriteSheetUrl)),
      optional: false,
    },
    { code: "INTERACTION", done: draft.transitions.length > 0, optional: true },
    { code: "VALID", done: validation.ok, optional: false },
  ];

  const level: ReadinessLevel = !draft.enabled
    ? "STATIC"
    : !validation.ok
      ? "INVALID"
      : blocking.length > 0 || draft.animations.length === 0
        ? "INCOMPLETE"
        : "READY";

  return { level, errors: validation.errors, grouped, notices, blocking, checklist };
}

// ═══════════════════════ el próximo paso ═══════════════════════

export type NextStepCode =
  | "ENABLE"
  | "FIX_ERRORS"
  | "ADD_ANIMATION"
  | "UPLOAD_FRAMES"
  | "USE_ANIMATION"
  | "ADD_TRANSITION"
  | "FIX_NOTICES"
  | "DONE";

/**
 * Qué conviene hacer AHORA, uno solo.
 *
 * Un creador que activa el comportamiento se encuentra con tres secciones
 * vacías y ningún orden sugerido. Esto responde "¿y ahora qué?" con un único
 * paso, el más temprano que falte.
 */
export function nextStep(draft: BehaviorDraft): NextStepCode {
  if (!draft.enabled) return "ENABLE";

  const validation = validateDraft(draft);
  if (!validation.ok) return "FIX_ERRORS";

  if (draft.animations.length === 0) return "ADD_ANIMATION";

  if (draft.animations.some((animation) => !animation.spriteSheetUrl)) {
    return "UPLOAD_FRAMES";
  }

  if (draft.animations.some((animation) => !animationIsUsed(draft, animation))) {
    return "USE_ANIMATION";
  }

  if (draft.transitions.length === 0) return "ADD_TRANSITION";

  const blocking = collectNotices(draft).filter((notice) =>
    isBlockingNotice(notice.code),
  );
  if (blocking.length > 0) return "FIX_NOTICES";

  return "DONE";
}

// ═══════════════════════ consecuencias de borrar ═══════════════════════

export type DeletionImpact = {
  kind: ErrorRowKind;
  key: string;
  /** Transiciones de click que desaparecen con el borrado. */
  removedTransitions: number;
  /** Estados que se quedan sin su animación. */
  statesLosingAnimation: string[];
  /** Nuevo estado inicial, si el borrado obliga a cambiarlo. */
  newInitialState: string | null;
  /** Se borra el último estado y el comportamiento queda sin ninguno. */
  leavesNoStates: boolean;
  /** Nada más cambia: se puede borrar sin preguntar. */
  harmless: boolean;
};

/**
 * Qué se lleva por delante borrar una fila.
 *
 * No lo deduce: EJECUTA el mutador real (`removeState` / `removeAnimation`) y
 * compara el antes con el después. Así es imposible que el aviso prometa una
 * cosa y el borrado haga otra — si mañana el mutador cambia, este texto cambia
 * con él.
 */
function diffImpact(
  kind: ErrorRowKind,
  key: string,
  before: BehaviorDraft,
  after: BehaviorDraft,
): DeletionImpact {
  const removedTransitions = before.transitions.length - after.transitions.length;

  const statesLosingAnimation = before.states
    .filter((state) => {
      const survivor = after.states.find((item) => item.id === state.id);
      return Boolean(state.animation) && survivor !== undefined && !survivor.animation;
    })
    .map((state) => state.key);

  const newInitialState =
    before.initialState !== after.initialState ? after.initialState : null;

  return {
    kind,
    key,
    removedTransitions,
    statesLosingAnimation,
    newInitialState,
    leavesNoStates: before.states.length > 0 && after.states.length === 0,
    harmless:
      removedTransitions === 0 &&
      statesLosingAnimation.length === 0 &&
      newInitialState === null &&
      after.states.length > 0,
  };
}

export function describeStateDeletion(
  draft: BehaviorDraft,
  id: string,
): DeletionImpact | null {
  const state = draft.states.find((item) => item.id === id);
  if (!state) return null;

  return diffImpact("state", state.key, draft, removeState(draft, id));
}

export function describeAnimationDeletion(
  draft: BehaviorDraft,
  id: string,
): DeletionImpact | null {
  const animation = draft.animations.find((item) => item.id === id);
  if (!animation) return null;

  return diffImpact("animation", animation.key, draft, removeAnimation(draft, id));
}

/**
 * Qué se pierde al apagar el comportamiento (volver a "objeto estático").
 *
 * Es el botón más destructivo del editor —borra estados, animaciones y
 * transiciones de una vez— y hoy no avisa de nada.
 */
export function describeDisableImpact(draft: BehaviorDraft): {
  states: number;
  animations: number;
  transitions: number;
  /** Nada configurado todavía: apagar no destruye nada. */
  harmless: boolean;
} {
  const states = draft.states.length;
  const animations = draft.animations.length;
  const transitions = draft.transitions.length;

  return {
    states,
    animations,
    transitions,
    // Un solo estado, sin animaciones ni clicks, es lo que deja
    // `createStarterDraft()` al encender el interruptor: no lo escribió el
    // creador, así que perderlo no es perder nada y no hay que preguntar.
    // Preguntarlo convertía el primer click en una plantilla en un diálogo
    // innecesario (detectado en la QA de navegador de la Fase 11).
    harmless: !draft.enabled || (animations === 0 && transitions === 0 && states <= 1),
  };
}

// ═══════════════════════ resumen (plantillas, cabecera) ═══════════════════════

export type BehaviorSummary = {
  states: number;
  animations: number;
  transitions: number;
  interactive: boolean;
};

/** Resumen de un behavior de referencia, para explicar una plantilla. */
export function summarizeBehavior(behavior: WorldBehavior): BehaviorSummary {
  return {
    states: behavior.states.length,
    animations: behavior.animations.length,
    transitions: behavior.transitions.length,
    interactive: behavior.transitions.length > 0,
  };
}

export function summarizeDraft(draft: BehaviorDraft): BehaviorSummary {
  return {
    states: draft.states.length,
    animations: draft.animations.length,
    transitions: draft.transitions.length,
    interactive: draft.transitions.length > 0,
  };
}

// ═══════════════════════ cambios sin guardar ═══════════════════════

/**
 * Huella del draft, para saber si hay cambios sin guardar.
 *
 * Se serializa campo por campo en un orden fijo en vez de con
 * `JSON.stringify` del objeto entero, por dos razones: los `id` de fila no
 * cuentan (son de React, cambian sin que el creador toque nada) y el orden de
 * las claves de un objeto no es algo en lo que valga la pena confiar — es la
 * misma razón por la que en el backend los behaviors no se comparan
 * serializándolos.
 */
export function draftFingerprint(draft: BehaviorDraft): string {
  if (!draft.enabled) return "static";

  const states = draft.states
    .map((state) => `${state.key}>${state.animation ?? ""}`)
    .join("|");

  const animations = draft.animations
    .map(
      (animation) =>
        [
          animation.key,
          animation.fps,
          animation.loop ? 1 : 0,
          animation.directional ? 1 : 0,
          animation.framesCount,
          animation.row,
          animation.startCol,
          animation.spriteSheetUrl ?? "",
        ].join(","),
    )
    .join("|");

  const transitions = draft.transitions
    .map((transition) =>
      [
        transition.trigger,
        transition.fromState,
        transition.action,
        transition.animation ?? "",
        transition.onComplete,
        transition.targetState ?? "",
      ].join(","),
    )
    .join("|");

  return `on;${draft.initialState};${states};${animations};${transitions}`;
}

export function isDraftDirty(a: BehaviorDraft, b: BehaviorDraft): boolean {
  return draftFingerprint(a) !== draftFingerprint(b);
}

// ═══════════════════════ selección de frames ═══════════════════════

export type FrameSelectionProblem =
  | "NONE"
  /** No se eligió ningún PNG. */
  | "EMPTY"
  /** No es múltiplo de las caras: sobran o faltan archivos. */
  | "NOT_MULTIPLE"
  /** Más frames de los que admite una animación. */
  | "TOO_MANY";

export type FrameSelection = {
  /** Nombres ORDENADOS: ese orden es el orden de los frames en el atlas. */
  names: string[];
  rows: number;
  framesCount: number;
  problem: FrameSelectionProblem;
  /** Se puede subir. */
  ok: boolean;
  /** Cuántos archivos faltan para completar la última cara. */
  missingForNextRow: number;
};

/**
 * Orden natural: `frame_2` antes que `frame_10`.
 *
 * Un `sort()` normal los pondría al revés y la animación saldría con los
 * frames desordenados, que es un fallo caro de diagnosticar: el atlas se sube
 * bien, el objeto se guarda bien y el movimiento sale mal.
 */
export function sortByFrameName<T>(items: T[], name: (item: T) => string): T[] {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return [...items].sort((a, b) => collator.compare(name(a), name(b)));
}

export function sortFrameNames(names: string[]): string[] {
  return sortByFrameName(names, (name) => name);
}

/**
 * Diagnóstico de la selección ANTES de subirla.
 *
 * El límite de frames lo aplica el backend igual (Fase 2), pero enterarse
 * después de subir 30 PNG por un 400 es la peor manera posible de aprenderlo.
 */
export function describeFrameSelection(
  names: string[],
  directions: number,
): FrameSelection {
  const rows = Math.max(1, Math.trunc(directions) || 1);
  const sorted = sortFrameNames(names);
  const framesCount = Math.floor(sorted.length / rows);
  const remainder = sorted.length % rows;

  const problem: FrameSelectionProblem =
    sorted.length === 0
      ? "EMPTY"
      : remainder !== 0
        ? "NOT_MULTIPLE"
        : framesCount > LIMITS.maxFramesPerAnimation
          ? "TOO_MANY"
          : "NONE";

  return {
    names: sorted,
    rows,
    framesCount,
    problem,
    ok: problem === "NONE",
    missingForNextRow: remainder === 0 ? 0 : rows - remainder,
  };
}

// ═══════════════════════ hoja de la animación ═══════════════════════

/**
 * Celda REAL de la hoja de una animación, derivada de las medidas del PNG.
 *
 * La tarjeta de cada animación dibuja su atlas con `SpriteSheetPreview`, que
 * necesita el tamaño de celda. Antes se le pasaba `64×64` fijo: con un sprite
 * real de 32×48 la hoja salía estirada, la grilla amarilla desalineada y la
 * celda animada aplastada. Lo detectó la QA de navegador de la Fase 11 — los
 * tests unitarios no dibujan nada.
 *
 * No se reimplementa la derivación: es `resolveAtlasGeometry()`, la misma que
 * usan la prueba del editor y el juego, así que la tarjeta no puede mostrar
 * una celda distinta de la que se va a ver en la sala. Sólo lee
 * `framesCount` y `directional` de la animación.
 *
 * Devuelve null si el atlas no casa con su metadata (o todavía no se midió).
 */
export function sheetPreviewGeometry(
  animation: { framesCount: number; directional: boolean },
  atlas: { width: number; height: number } | null | undefined,
  directions: number,
): AtlasGeometry | null {
  return resolveAtlasGeometry(
    {
      key: "_",
      row: 0,
      startCol: 0,
      framesCount: animation.framesCount,
      fps: 1,
      loop: false,
      directional: animation.directional,
      spriteSheetUrl: null,
    },
    atlas,
    directions,
  );
}
