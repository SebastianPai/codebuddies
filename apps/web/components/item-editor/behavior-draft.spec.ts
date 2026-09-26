import {
  BATHTUB_BEHAVIOR,
  DOOR_BEHAVIOR,
  PALM_BEHAVIOR,
  TV_BEHAVIOR,
  validateBehavior,
} from "@codebuddies/world-objects";

import {
  addAnimation,
  addState,
  addTransition,
  availableCompletions,
  BEHAVIOR_LIMITS as LIMITS,
  createEmptyDraft,
  createStarterDraft,
  draftFromBehavior,
  draftFromTemplate,
  draftKind,
  draftToBehavior,
  draftToPayload,
  hasTransitionFor,
  removeAnimation,
  removeState,
  removeTransition,
  updateAnimation,
  updateState,
  updateTransition,
  uniqueKey,
  validateDraft,
  type BehaviorDraft,
} from "./behavior-draft";

/**
 * Lógica del editor de comportamiento.
 *
 * `apps/web` no tiene runner de tests ni React Testing Library, así que toda la
 * lógica vive en este módulo puro (sin React) y se prueba con el Jest de
 * apps/api. El componente es sólo render sobre estas funciones.
 *
 *   cd apps/api && npx jest --config <config con rootDir al repo>
 */

/** Atajo: encuentra una fila por su clave. */
const stateByKey = (draft: BehaviorDraft, key: string) =>
  draft.states.find((state) => state.key === key)!;
const animationByKey = (draft: BehaviorDraft, key: string) =>
  draft.animations.find((animation) => animation.key === key)!;

/** Draft de una TV, montado como lo haría el creador desde cero. */
function buildTvDraft(): BehaviorDraft {
  let draft = createStarterDraft();
  draft = updateState(draft, draft.states[0].id, { key: "OFF" });
  draft = addState(draft);
  draft = updateState(draft, draft.states[1].id, { key: "ON" });

  draft = addAnimation(draft);
  draft = updateAnimation(draft, draft.animations[0].id, {
    key: "turn_on",
    fps: 12,
    loop: false,
    framesCount: 5,
    spriteSheetUrl: "https://cdn/turn_on.png",
  });

  draft = addAnimation(draft);
  draft = updateAnimation(draft, draft.animations[1].id, {
    key: "screen_loop",
    fps: 8,
    loop: true,
    framesCount: 8,
    spriteSheetUrl: "https://cdn/screen_loop.png",
  });

  draft = updateState(draft, stateByKey(draft, "ON").id, { animation: "screen_loop" });

  draft = addTransition(draft);
  draft = updateTransition(draft, draft.transitions[0].id, {
    fromState: "OFF",
    action: "PLAY_ANIMATION",
    animation: "turn_on",
    onComplete: "SET_STATE",
    targetState: "ON",
  });

  return draft;
}

// ═══════════════════════════════ estados ═══════════════════════════════

describe("estados", () => {
  it("agregar el primer estado lo deja como estado inicial", () => {
    // Sin estado inicial el behavior no es válido; hacérselo elegir a mano
    // sería un paso extra sin decisión real.
    const draft = addState(createEmptyDraft());
    expect(draft.states).toHaveLength(1);
    expect(draft.initialState).toBe(draft.states[0].key);
  });

  it("agregar más estados no cambia el inicial", () => {
    let draft = addState(createEmptyDraft());
    const first = draft.initialState;
    draft = addState(draft);
    expect(draft.initialState).toBe(first);
  });

  it("propone claves únicas", () => {
    let draft = addState(createEmptyDraft());
    draft = addState(draft);
    draft = addState(draft);
    const keys = draft.states.map((state) => state.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("renombrar un estado arrastra el estado inicial", () => {
    let draft = addState(createEmptyDraft());
    draft = updateState(draft, draft.states[0].id, { key: "APAGADA" });
    expect(draft.initialState).toBe("APAGADA");
  });

  it("renombrar un estado arrastra las transiciones que lo usan", () => {
    let draft = buildTvDraft();
    draft = updateState(draft, stateByKey(draft, "ON").id, { key: "ENCENDIDA" });

    expect(draft.transitions[0].targetState).toBe("ENCENDIDA");
    expect(validateDraft(draft).ok).toBe(true);
  });

  it("renombrar el estado ORIGEN también arrastra la transición", () => {
    let draft = buildTvDraft();
    draft = updateState(draft, stateByKey(draft, "OFF").id, { key: "APAGADA" });

    expect(draft.transitions[0].fromState).toBe("APAGADA");
    expect(draft.initialState).toBe("APAGADA");
    expect(validateDraft(draft).ok).toBe(true);
  });

  it("borrar un estado se lleva sus transiciones", () => {
    let draft = buildTvDraft();
    draft = removeState(draft, stateByKey(draft, "ON").id);

    expect(draft.states.map((state) => state.key)).toEqual(["OFF"]);
    // La transición apuntaba a ON: dejarla colgando sólo daría un error que el
    // creador no sabría interpretar.
    expect(draft.transitions).toHaveLength(0);
  });

  it("borrar el estado inicial reasigna el inicial al primero que queda", () => {
    let draft = buildTvDraft();
    draft = removeState(draft, stateByKey(draft, "OFF").id);

    expect(draft.initialState).toBe("ON");
    expect(validateDraft(draft).ok).toBe(true);
  });

  it("un estado puede no tener animación", () => {
    const draft = buildTvDraft();
    expect(stateByKey(draft, "OFF").animation).toBeNull();
    expect(validateDraft(draft).ok).toBe(true);
  });

  it("un estado puede seleccionar una animación existente", () => {
    const draft = buildTvDraft();
    expect(stateByKey(draft, "ON").animation).toBe("screen_loop");
  });

  it("no deja pasar del máximo de estados", () => {
    let draft = createEmptyDraft();
    for (let index = 0; index < LIMITS.maxStates + 3; index++) draft = addState(draft);
    expect(draft.states).toHaveLength(LIMITS.maxStates);
  });

  it("claves duplicadas se rechazan al validar", () => {
    let draft = buildTvDraft();
    draft = updateState(draft, stateByKey(draft, "ON").id, { key: "OFF" });

    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("duplicada"))).toBe(true);
  });

  it("uniqueKey genera sufijos legibles", () => {
    expect(uniqueKey([], "ESTADO")).toBe("ESTADO");
    expect(uniqueKey(["ESTADO"], "ESTADO")).toBe("ESTADO_2");
    expect(uniqueKey(["ESTADO", "ESTADO_2"], "ESTADO")).toBe("ESTADO_3");
  });
});

// ═════════════════════════════ animaciones ═════════════════════════════

describe("animaciones", () => {
  it("crear una animación la deja usable con valores por defecto", () => {
    const draft = addAnimation(createStarterDraft());
    const animation = draft.animations[0];

    expect(animation.fps).toBeGreaterThanOrEqual(LIMITS.minFps);
    expect(animation.fps).toBeLessThanOrEqual(LIMITS.maxFps);
    expect(animation.framesCount).toBeGreaterThanOrEqual(1);
    expect(animation.loop).toBe(false);
  });

  it("editar fps, loop y directional", () => {
    let draft = addAnimation(createStarterDraft());
    const id = draft.animations[0].id;

    draft = updateAnimation(draft, id, { fps: 24 });
    expect(draft.animations[0].fps).toBe(24);

    draft = updateAnimation(draft, id, { loop: true });
    expect(draft.animations[0].loop).toBe(true);

    draft = updateAnimation(draft, id, { directional: true });
    expect(draft.animations[0].directional).toBe(true);
  });

  it("asignar el spritesheet que devolvió el generador de atlas", () => {
    let draft = addAnimation(createStarterDraft());
    draft = updateAnimation(draft, draft.animations[0].id, {
      spriteSheetUrl: "https://cdn/atlas.png",
      framesCount: 5,
      directional: true,
      row: 0,
      startCol: 0,
    });

    expect(draft.animations[0]).toMatchObject({
      spriteSheetUrl: "https://cdn/atlas.png",
      framesCount: 5,
      directional: true,
      row: 0,
      startCol: 0,
    });
  });

  it("renombrar una animación arrastra estados y transiciones", () => {
    let draft = buildTvDraft();
    draft = updateAnimation(draft, animationByKey(draft, "screen_loop").id, {
      key: "pantalla",
    });

    expect(stateByKey(draft, "ON").animation).toBe("pantalla");
    expect(validateDraft(draft).ok).toBe(true);
  });

  it("borrar una animación limpia el estado que la usaba", () => {
    let draft = buildTvDraft();
    draft = removeAnimation(draft, animationByKey(draft, "screen_loop").id);

    expect(stateByKey(draft, "ON").animation).toBeNull();
    expect(validateDraft(draft).ok).toBe(true);
  });

  it("borrar una animación se lleva las transiciones que la reproducían", () => {
    let draft = buildTvDraft();
    draft = removeAnimation(draft, animationByKey(draft, "turn_on").id);

    expect(draft.transitions).toHaveLength(0);
    expect(validateDraft(draft).ok).toBe(true);
  });

  it("no deja pasar del máximo de animaciones", () => {
    let draft = createStarterDraft();
    for (let index = 0; index < LIMITS.maxAnimations + 3; index++) {
      draft = addAnimation(draft);
    }
    expect(draft.animations).toHaveLength(LIMITS.maxAnimations);
  });
});

// ═══════════════════ la regla del loop (PARTE 13) ═══════════════════

describe("una animación en bucle no puede terminar en un estado", () => {
  it("no se ofrece 'ir a estado' para una animación en bucle", () => {
    const draft = buildTvDraft();

    expect(availableCompletions(draft, "turn_on")).toContain("SET_STATE");
    // screen_loop es loop: nunca termina, así que "al terminar" no existe.
    expect(availableCompletions(draft, "screen_loop")).toEqual(["REPEAT", "NONE"]);
  });

  it("elegir una animación en bucle degrada un 'ir a estado' ya configurado", () => {
    let draft = buildTvDraft();
    draft = updateTransition(draft, draft.transitions[0].id, {
      animation: "screen_loop",
    });

    expect(draft.transitions[0].onComplete).toBe("NONE");
    expect(draft.transitions[0].targetState).toBeNull();
    expect(validateDraft(draft).ok).toBe(true);
  });

  it("marcar loop en una animación ya usada repara la transición", () => {
    // Si no, el creador dejaría guardado algo que el validador rechaza sin que
    // se entienda por qué: la transición nunca se dispararía.
    let draft = buildTvDraft();
    draft = updateAnimation(draft, animationByKey(draft, "turn_on").id, { loop: true });

    expect(draft.transitions[0].onComplete).toBe("NONE");
    expect(validateDraft(draft).ok).toBe(true);
  });

  it("es imposible construir desde el editor loop + SET_STATE", () => {
    let draft = buildTvDraft();
    draft = updateAnimation(draft, animationByKey(draft, "turn_on").id, { loop: true });
    draft = updateTransition(draft, draft.transitions[0].id, {
      onComplete: "SET_STATE",
      targetState: "ON",
    });

    // updateTransition vuelve a degradarlo.
    expect(draft.transitions[0].onComplete).toBe("NONE");
    expect(validateDraft(draft).ok).toBe(true);
  });
});

// ═══════════════════════════ transiciones ═══════════════════════════

describe("transiciones", () => {
  it("crear una transición propone valores coherentes", () => {
    const draft = addTransition(buildTvDraft());
    const created = draft.transitions[1];

    expect(created.trigger).toBe("CLICK");
    // Propone un estado que todavía no tiene transición: el par
    // (trigger, estado) debe ser único.
    expect(created.fromState).toBe("ON");
  });

  it("sólo expone el trigger CLICK", () => {
    const draft = addTransition(buildTvDraft());
    expect(draft.transitions.every((transition) => transition.trigger === "CLICK")).toBe(
      true,
    );
  });

  it("elegir estado origen, animación y destino", () => {
    let draft = addTransition(buildTvDraft());
    const id = draft.transitions[1].id;

    draft = updateTransition(draft, id, {
      fromState: "ON",
      animation: "turn_on",
      onComplete: "SET_STATE",
      targetState: "OFF",
    });

    expect(draft.transitions[1]).toMatchObject({
      fromState: "ON",
      animation: "turn_on",
      onComplete: "SET_STATE",
      targetState: "OFF",
    });
  });

  it("acción SET_STATE: cambia de estado sin animación de paso", () => {
    let draft = addTransition(buildTvDraft());
    draft = updateTransition(draft, draft.transitions[1].id, {
      fromState: "ON",
      action: "SET_STATE",
      targetState: "OFF",
    });

    const behavior = draftToBehavior(draft);
    expect(behavior.transitions[1]).toEqual({
      trigger: "CLICK",
      fromState: "ON",
      action: "SET_STATE",
      state: "OFF",
    });
    expect(validateDraft(draft).ok).toBe(true);
  });

  it("al terminar: REPEAT", () => {
    let draft = addTransition(buildTvDraft());
    draft = updateTransition(draft, draft.transitions[1].id, {
      fromState: "ON",
      animation: "turn_on",
      onComplete: "REPEAT",
    });

    expect(draftToBehavior(draft).transitions[1]).toMatchObject({
      onComplete: { action: "REPEAT" },
    });
    expect(validateDraft(draft).ok).toBe(true);
  });

  it("al terminar: NONE", () => {
    let draft = addTransition(buildTvDraft());
    draft = updateTransition(draft, draft.transitions[1].id, {
      fromState: "ON",
      animation: "turn_on",
      onComplete: "NONE",
    });

    expect(draftToBehavior(draft).transitions[1]).toMatchObject({
      onComplete: { action: "NONE" },
    });
    expect(validateDraft(draft).ok).toBe(true);
  });

  it("detecta un par (trigger, estado) repetido", () => {
    const draft = buildTvDraft();
    expect(hasTransitionFor(draft, "OFF")).toBe(true);
    expect(hasTransitionFor(draft, "ON")).toBe(false);
    // Ignorando la propia fila, para poder reeditarla.
    expect(hasTransitionFor(draft, "OFF", draft.transitions[0].id)).toBe(false);
  });

  it("dos transiciones para el mismo par se rechazan al validar", () => {
    let draft = addTransition(buildTvDraft());
    draft = updateTransition(draft, draft.transitions[1].id, { fromState: "OFF" });

    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("ya hay una transición"))).toBe(
      true,
    );
  });

  it("una transición hacia un estado inexistente no valida", () => {
    let draft = buildTvDraft();
    draft = updateTransition(draft, draft.transitions[0].id, {
      targetState: "NO_EXISTE",
    });
    expect(validateDraft(draft).ok).toBe(false);
  });

  it("una transición con una animación inexistente no valida", () => {
    let draft = buildTvDraft();
    draft = updateTransition(draft, draft.transitions[0].id, {
      animation: "no_existe",
    });
    expect(validateDraft(draft).ok).toBe(false);
  });

  it("borrar una transición no toca nada más", () => {
    let draft = buildTvDraft();
    draft = removeTransition(draft, draft.transitions[0].id);

    expect(draft.transitions).toHaveLength(0);
    expect(draft.states).toHaveLength(2);
    expect(draft.animations).toHaveLength(2);
  });
});

// ════════════════════ validación y conversión ════════════════════

describe("validación", () => {
  it("un draft desactivado siempre es válido", () => {
    expect(validateDraft(createEmptyDraft())).toEqual({ ok: true, errors: [] });
  });

  it("el estado inicial vacío no valida", () => {
    let draft = createStarterDraft();
    draft = { ...draft, initialState: "" };
    expect(validateDraft(draft).ok).toBe(false);
  });

  it("un estado inicial que no existe no valida", () => {
    const draft = { ...buildTvDraft(), initialState: "FANTASMA" };
    const result = validateDraft(draft);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("no existe en states"))).toBe(
      true,
    );
  });

  it("delega en validateBehavior: mismos errores, sin reglas propias", () => {
    const draft = { ...buildTvDraft(), initialState: "FANTASMA" };
    expect(validateDraft(draft).errors).toEqual(
      validateBehavior(draftToBehavior(draft)).errors,
    );
  });

  it("recorta los espacios de las claves antes de validar", () => {
    let draft = buildTvDraft();
    draft = updateState(draft, stateByKey(draft, "ON").id, { key: "  ON  " });

    // El renombrado arrastra referencias, así que sigue siendo coherente…
    const behavior = draftToBehavior(draft);
    expect(behavior.states.map((state) => state.key)).toContain("ON");
  });
});

describe("draftToBehavior produce un WorldBehavior válido", () => {
  it("la TV montada a mano pasa el validador del paquete", () => {
    const draft = buildTvDraft();
    const result = validateBehavior(draftToBehavior(draft));

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("el JSON generado tiene exactamente la forma del contrato", () => {
    const behavior = draftToBehavior(buildTvDraft());

    expect(behavior.version).toBe(1);
    expect(behavior.initialState).toBe("OFF");
    expect(behavior.states).toEqual([
      { key: "OFF", animation: null },
      { key: "ON", animation: "screen_loop" },
    ]);
    expect(behavior.animations[0]).toEqual({
      key: "turn_on",
      row: 0,
      startCol: 0,
      framesCount: 5,
      fps: 12,
      loop: false,
      directional: false,
      spriteSheetUrl: "https://cdn/turn_on.png",
    });
    expect(behavior.transitions[0]).toEqual({
      trigger: "CLICK",
      fromState: "OFF",
      action: "PLAY_ANIMATION",
      animation: "turn_on",
      onComplete: { action: "SET_STATE", state: "ON" },
    });
  });

  it("no inventa propiedades fuera del contrato", () => {
    const behavior = draftToBehavior(buildTvDraft()) as Record<string, unknown>;
    expect(Object.keys(behavior).sort()).toEqual([
      "animations",
      "initialState",
      "states",
      "transitions",
      "version",
    ]);
    // Y los `id` de fila, que son sólo para React, no viajan.
    expect(JSON.stringify(behavior)).not.toContain('"id"');
  });
});

// ═══════════════ ida y vuelta con behaviors existentes ═══════════════

describe("cargar un behavior existente", () => {
  it.each([
    ["TV", TV_BEHAVIOR],
    ["bañera", BATHTUB_BEHAVIOR],
    ["puerta", DOOR_BEHAVIOR],
    ["palmera", PALM_BEHAVIOR],
  ])("%s hace ida y vuelta sin perder nada", (_label, behavior) => {
    const draft = draftFromBehavior(behavior);
    expect(draft.enabled).toBe(true);
    expect(draftToBehavior(draft)).toEqual(behavior);
  });

  it("un behavior nulo abre el editor desactivado", () => {
    expect(draftFromBehavior(null).enabled).toBe(false);
    expect(draftFromBehavior(undefined).enabled).toBe(false);
  });

  it("un behavior corrupto abre el editor vacío en vez de a medias", () => {
    expect(draftFromBehavior({ version: 1, states: "no-soy-array" }).enabled).toBe(false);
    expect(draftFromBehavior("basura").enabled).toBe(false);
  });

  it("las plantillas salen de los ejemplos del paquete, sin copiar JSON", () => {
    const draft = draftFromTemplate(TV_BEHAVIOR);
    expect(draftToBehavior(draft)).toEqual(TV_BEHAVIOR);
    expect(validateDraft(draft).ok).toBe(true);
  });
});

// ═════════════════════ qué se manda al backend ═════════════════════

describe("draftToPayload — semántica de undefined / null", () => {
  it("activado ⇒ manda el behavior", () => {
    const payload = draftToPayload(buildTvDraft(), false);
    expect(payload).toMatchObject({ version: 1, initialState: "OFF" });
  });

  it("desactivado en un objeto que SÍ tenía ⇒ null (lo borra)", () => {
    expect(draftToPayload(createEmptyDraft(), true)).toBeNull();
  });

  it("desactivado en un objeto que NUNCA tuvo ⇒ undefined (no toca la columna)", () => {
    // Escribir null ahí sería un cambio inventado sobre una columna que ya es
    // null, y rompería la semántica de PATCH parcial del backend.
    expect(draftToPayload(createEmptyDraft(), false)).toBeUndefined();
  });

  it("undefined nunca se convierte accidentalmente en null", () => {
    const payload = draftToPayload(createEmptyDraft(), false);
    expect(payload).not.toBeNull();
    expect(payload).toBeUndefined();
  });
});

// ═══════════════════════ clasificación ═══════════════════════

describe("draftKind reutiliza describeBehaviorKind", () => {
  it("sin comportamiento ⇒ STATIC", () => {
    expect(draftKind(createEmptyDraft())).toBe("STATIC");
  });

  it("con animación de estado y sin transiciones ⇒ ANIMATED", () => {
    // Un objeto animado no es automáticamente interactivo.
    expect(draftKind(draftFromBehavior(PALM_BEHAVIOR))).toBe("ANIMATED");
  });

  it("con una transición de click ⇒ INTERACTIVE", () => {
    expect(draftKind(buildTvDraft())).toBe("INTERACTIVE");
    expect(draftKind(draftFromBehavior(DOOR_BEHAVIOR))).toBe("INTERACTIVE");
  });

  it("un objeto animado sin interacción es configurable y válido", () => {
    let draft = createStarterDraft();
    draft = addAnimation(draft);
    draft = updateAnimation(draft, draft.animations[0].id, {
      key: "idle_loop",
      loop: true,
      framesCount: 6,
      fps: 6,
      spriteSheetUrl: "https://cdn/idle.png",
    });
    draft = updateState(draft, draft.states[0].id, { animation: "idle_loop" });

    expect(validateDraft(draft).ok).toBe(true);
    expect(draftKind(draft)).toBe("ANIMATED");
    expect(draftToBehavior(draft).transitions).toEqual([]);
  });
});
