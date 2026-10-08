/**
 * Tests de lo que el editor EXPLICA (Fase 10).
 *
 * Todo lo de acá es UX derivada: ningún test afirma que algo es válido o
 * inválido por su cuenta — cuando hace falta esa verdad se compara contra
 * `validateDraft()`, que delega en el paquete compartido.
 */

import { DOOR_BEHAVIOR, resolveAtlasGeometry, TV_BEHAVIOR } from "@codebuddies/world-objects";

import {
  addAnimation,
  addState,
  addTransition,
  createEmptyDraft,
  createStarterDraft,
  draftFromTemplate,
  removeState,
  updateAnimation,
  updateState,
  updateTransition,
  validateDraft,
  type BehaviorDraft,
} from "./behavior-draft";

import {
  collectNotices,
  describeAnimationDeletion,
  describeClickOutcome,
  describeDisableImpact,
  describeFrameSelection,
  describeStateCard,
  describeStateDeletion,
  draftFingerprint,
  errorsForRow,
  groupBehaviorErrors,
  isBlockingNotice,
  isDraftDirty,
  locateBehaviorError,
  nextStep,
  readiness,
  sheetPreviewGeometry,
  sortFrameNames,
  summarizeBehavior,
  summarizeDraft,
  transitionFromState,
} from "./behavior-guidance";

/** TV completo (OFF/ON con atlas), el caso de referencia de un objeto listo. */
function tvDraft(): BehaviorDraft {
  const draft = draftFromTemplate(TV_BEHAVIOR);
  return {
    ...draft,
    animations: draft.animations.map((animation) => ({
      ...animation,
      spriteSheetUrl: `https://cdn.test/${animation.key}.png`,
      framesCount: Math.max(2, animation.framesCount),
    })),
  };
}

function codes(draft: BehaviorDraft): string[] {
  return collectNotices(draft).map((notice) => notice.code);
}

// ═════════════════ ubicación de errores ═════════════════

describe("locateBehaviorError", () => {
  it("lee la fila del prefijo que ya pone el validador", () => {
    expect(locateBehaviorError('transitions[1].animation: "x" no existe')).toEqual({
      kind: "transition",
      index: 1,
    });
    expect(locateBehaviorError('states[0].key: clave inválida')).toEqual({
      kind: "state",
      index: 0,
    });
    expect(locateBehaviorError("animations[2].fps: debe estar entre 1 y 30")).toEqual({
      kind: "animation",
      index: 2,
    });
  });

  it("trata como general lo que no habla de una fila", () => {
    expect(locateBehaviorError('behavior.initialState: "X" no existe en states')).toEqual(
      { kind: "general", index: null },
    );
  });

  it("reparte una lista real de errores del validador", () => {
    // Estado inicial inexistente + una animación que no existe: los dos
    // mensajes los produce el validador compartido, no este módulo.
    let draft = createStarterDraft();
    draft = { ...draft, initialState: "NO_EXISTE" };
    draft = addTransition(draft);
    draft = updateTransition(draft, draft.transitions[0].id, {
      animation: "fantasma",
    });

    const errors = validateDraft(draft).errors;
    expect(errors.length).toBeGreaterThan(0);

    const grouped = groupBehaviorErrors(errors);
    expect(grouped.general.some((error) => error.includes("initialState"))).toBe(true);
    expect(grouped.transitions.get(0)?.length).toBeGreaterThan(0);
  });

  it("errorsForRow encuentra los errores por id de fila", () => {
    let draft = createStarterDraft();
    draft = updateState(draft, draft.states[0].id, { key: "con espacio" });

    const grouped = groupBehaviorErrors(validateDraft(draft).errors);
    const own = errorsForRow(draft, grouped, "state", draft.states[0].id);

    expect(own.length).toBeGreaterThan(0);
    expect(errorsForRow(draft, grouped, "state", "no-existe")).toEqual([]);
  });
});

// ═════════════════ qué pasa al hacer click ═════════════════

describe("describeClickOutcome", () => {
  it("reproducir y quedarse en otro estado", () => {
    const draft = tvDraft();
    const transition = transitionFromState(draft, "OFF");
    expect(transition).not.toBeNull();
    expect(describeClickOutcome(transition!)).toEqual({
      kind: "PLAY_THEN_GO",
      animation: expect.any(String),
      state: expect.any(String),
    });
  });

  it("ir derecho a otro estado", () => {
    expect(
      describeClickOutcome({
        id: "t",
        trigger: "CLICK",
        fromState: "A",
        action: "SET_STATE",
        animation: null,
        onComplete: "NONE",
        targetState: "B",
      }),
    ).toEqual({ kind: "GO_TO", state: "B" });
  });

  it("reproducir y volver al estado de partida", () => {
    expect(
      describeClickOutcome({
        id: "t",
        trigger: "CLICK",
        fromState: "A",
        action: "PLAY_ANIMATION",
        animation: "saludo",
        onComplete: "NONE",
        targetState: null,
      }),
    ).toEqual({ kind: "PLAY_THEN_BACK", animation: "saludo" });
  });

  it("reproducir indefinidamente", () => {
    expect(
      describeClickOutcome({
        id: "t",
        trigger: "CLICK",
        fromState: "A",
        action: "PLAY_ANIMATION",
        animation: "agua",
        onComplete: "REPEAT",
        targetState: null,
      }),
    ).toEqual({ kind: "PLAY_FOREVER", animation: "agua" });
  });

  it("marca como a medias lo que todavía no se puede contar", () => {
    expect(
      describeClickOutcome({
        id: "t",
        trigger: "CLICK",
        fromState: "A",
        action: "PLAY_ANIMATION",
        animation: null,
        onComplete: "NONE",
        targetState: null,
      }),
    ).toEqual({ kind: "INCOMPLETE" });

    expect(
      describeClickOutcome({
        id: "t",
        trigger: "CLICK",
        fromState: "A",
        action: "SET_STATE",
        animation: null,
        onComplete: "NONE",
        targetState: null,
      }),
    ).toEqual({ kind: "INCOMPLETE" });
  });
});

// ═════════════════ tarjeta de estado ═════════════════

describe("describeStateCard", () => {
  it("el TV: los dos estados se alcanzan y los dos reaccionan", () => {
    const draft = tvDraft();

    for (const state of draft.states) {
      const info = describeStateCard(draft, state);
      expect(info.reachable).toBe(true);
      expect(info.deadEnd).toBe(false);
      expect(info.onClick).not.toBeNull();
    }
  });

  it("señala el estado inicial", () => {
    const draft = tvDraft();
    const initial = draft.states.find((state) => state.key === draft.initialState)!;
    expect(describeStateCard(draft, initial).isInitial).toBe(true);
  });

  it("detecta un estado sin salida en un objeto interactivo", () => {
    // OFF → (play) → ON, y desde ON no hay ningún click: el televisor se
    // enciende y no se apaga nunca. El contrato lo acepta.
    let draft = tvDraft();
    const fromOn = draft.transitions.find((item) => item.fromState === "ON");
    draft = {
      ...draft,
      transitions: draft.transitions.filter((item) => item.id !== fromOn!.id),
    };

    expect(validateDraft(draft).ok).toBe(true);

    const on = draft.states.find((state) => state.key === "ON")!;
    expect(describeStateCard(draft, on).deadEnd).toBe(true);
    expect(describeStateCard(draft, on).onClick).toBeNull();
  });

  it("un objeto sólo animado no tiene estados sin salida", () => {
    // Sin ninguna transición, "sin salida" no significa nada: es una palmera.
    let draft = createStarterDraft();
    draft = addAnimation(draft);
    draft = updateAnimation(draft, draft.animations[0].id, {
      key: "viento",
      loop: true,
      framesCount: 4,
      spriteSheetUrl: "https://cdn.test/viento.png",
    });
    draft = updateState(draft, draft.states[0].id, { animation: "viento" });

    expect(describeStateCard(draft, draft.states[0]).deadEnd).toBe(false);
  });

  it("detecta un estado al que no se puede llegar", () => {
    let draft = tvDraft();
    draft = addState(draft);
    const huerfano = draft.states[draft.states.length - 1];

    const info = describeStateCard(draft, huerfano);
    expect(info.reachable).toBe(false);
    expect(info.reachableFrom).toEqual([]);
  });

  it("lista desde dónde se llega a un estado", () => {
    const draft = tvDraft();
    const on = draft.states.find((state) => state.key === "ON")!;
    expect(describeStateCard(draft, on).reachableFrom).toContain("OFF");
  });
});

// ═════════════════ avisos ═════════════════

describe("collectNotices", () => {
  it("un objeto estático no tiene nada que avisar", () => {
    expect(collectNotices(createEmptyDraft())).toEqual([]);
  });

  it("avisa de una animación sin frames subidos, que el contrato sí acepta", () => {
    let draft = createStarterDraft();
    draft = addAnimation(draft);
    draft = updateState(draft, draft.states[0].id, {
      animation: draft.animations[0].key,
    });

    expect(validateDraft(draft).ok).toBe(true);
    expect(codes(draft)).toContain("ANIMATION_WITHOUT_SPRITE");
  });

  it("avisa de una animación de un solo frame ya subida", () => {
    let draft = createStarterDraft();
    draft = addAnimation(draft);
    draft = updateAnimation(draft, draft.animations[0].id, {
      spriteSheetUrl: "https://cdn.test/pose.png",
      framesCount: 1,
    });
    draft = updateState(draft, draft.states[0].id, {
      animation: draft.animations[0].key,
    });

    expect(codes(draft)).toContain("ANIMATION_SINGLE_FRAME");
    expect(codes(draft)).not.toContain("ANIMATION_WITHOUT_SPRITE");
  });

  it("no habla de un solo frame mientras no haya atlas (el dato sale de subirlo)", () => {
    let draft = createStarterDraft();
    draft = addAnimation(draft);

    expect(codes(draft)).not.toContain("ANIMATION_SINGLE_FRAME");
  });

  it("avisa de una animación que nadie usa", () => {
    let draft = createStarterDraft();
    draft = addAnimation(draft);
    draft = updateAnimation(draft, draft.animations[0].id, {
      spriteSheetUrl: "https://cdn.test/x.png",
      framesCount: 3,
    });

    expect(codes(draft)).toContain("ANIMATION_UNUSED");
  });

  it("una animación usada sólo por una transición cuenta como usada", () => {
    const draft = tvDraft();
    expect(codes(draft)).not.toContain("ANIMATION_UNUSED");
  });

  it("avisa cuando el comportamiento está activado y no hay ni una animación", () => {
    expect(codes(createStarterDraft())).toContain("NO_ANIMATION");
  });

  it("avisa cuando hay animaciones pero nada reacciona al click", () => {
    let draft = createStarterDraft();
    draft = addAnimation(draft);
    draft = updateAnimation(draft, draft.animations[0].id, {
      spriteSheetUrl: "https://cdn.test/x.png",
      framesCount: 4,
      loop: true,
    });
    draft = updateState(draft, draft.states[0].id, {
      animation: draft.animations[0].key,
    });

    const list = codes(draft);
    expect(list).toContain("NO_INTERACTION");
    expect(list).not.toContain("NO_ANIMATION");
  });

  it("el TV completo no produce ningún aviso", () => {
    expect(collectNotices(tvDraft())).toEqual([]);
  });

  it("cada aviso apunta a la fila que lo provoca", () => {
    let draft = createStarterDraft();
    draft = addAnimation(draft);
    draft = updateState(draft, draft.states[0].id, {
      animation: draft.animations[0].key,
    });

    const notice = collectNotices(draft).find(
      (item) => item.code === "ANIMATION_WITHOUT_SPRITE",
    );
    expect(notice?.row).toEqual({
      kind: "animation",
      id: draft.animations[0].id,
      key: draft.animations[0].key,
    });
  });

  it("sólo los avisos que afectan a lo que se ve en la sala bloquean el listo", () => {
    expect(isBlockingNotice("ANIMATION_WITHOUT_SPRITE")).toBe(true);
    expect(isBlockingNotice("STATE_DEAD_END")).toBe(true);
    expect(isBlockingNotice("STATE_UNREACHABLE")).toBe(true);
    expect(isBlockingNotice("ANIMATION_UNUSED")).toBe(false);
    expect(isBlockingNotice("ANIMATION_SINGLE_FRAME")).toBe(false);
    expect(isBlockingNotice("NO_INTERACTION")).toBe(false);
  });
});

// ═════════════════ listo para publicar ═════════════════

describe("readiness", () => {
  it("objeto estático: STATIC y sin errores", () => {
    const result = readiness(createEmptyDraft());
    expect(result.level).toBe("STATIC");
    expect(result.errors).toEqual([]);
  });

  it("INVALID mientras el validador compartido lo rechace", () => {
    let draft = createStarterDraft();
    draft = { ...draft, initialState: "NO_EXISTE" };

    const result = readiness(draft);
    expect(result.level).toBe("INVALID");
    expect(result.errors).toEqual(validateDraft(draft).errors);
  });

  it("INCOMPLETE cuando se puede guardar pero en la sala no se vería", () => {
    let draft = createStarterDraft();
    draft = addAnimation(draft);
    draft = updateState(draft, draft.states[0].id, {
      animation: draft.animations[0].key,
    });

    const result = readiness(draft);
    expect(validateDraft(draft).ok).toBe(true);
    expect(result.level).toBe("INCOMPLETE");
    expect(result.blocking.map((notice) => notice.code)).toContain(
      "ANIMATION_WITHOUT_SPRITE",
    );
  });

  it("READY con el TV completo", () => {
    const result = readiness(tvDraft());
    expect(result.level).toBe("READY");
    expect(result.blocking).toEqual([]);
  });

  it("no inventa reglas: nada que el validador acepte se marca INVALID", () => {
    let draft = createStarterDraft();
    draft = addAnimation(draft);

    const result = readiness(draft);
    expect(validateDraft(draft).ok).toBe(true);
    expect(result.level).not.toBe("INVALID");
  });

  it("el checklist marca la interacción como opcional", () => {
    const item = readiness(tvDraft()).checklist.find(
      (entry) => entry.code === "INTERACTION",
    );
    expect(item).toEqual({ code: "INTERACTION", done: true, optional: true });
  });

  it("el checklist refleja los frames pendientes", () => {
    let draft = createStarterDraft();
    draft = addAnimation(draft);

    const sprites = readiness(draft).checklist.find((entry) => entry.code === "SPRITES");
    expect(sprites?.done).toBe(false);
    expect(readiness(tvDraft()).checklist.find((e) => e.code === "SPRITES")?.done).toBe(
      true,
    );
  });

  it("los errores del readiness son exactamente los del validador compartido", () => {
    let draft = createStarterDraft();
    draft = updateState(draft, draft.states[0].id, { key: "mal nombre" });

    expect(readiness(draft).errors).toEqual(validateDraft(draft).errors);
  });
});

// ═════════════════ próximo paso ═════════════════

describe("nextStep", () => {
  it("apagado: activar", () => {
    expect(nextStep(createEmptyDraft())).toBe("ENABLE");
  });

  it("recién activado: agregar una animación", () => {
    expect(nextStep(createStarterDraft())).toBe("ADD_ANIMATION");
  });

  it("animación sin atlas: subir los frames", () => {
    const draft = addAnimation(createStarterDraft());
    expect(nextStep(draft)).toBe("UPLOAD_FRAMES");
  });

  it("atlas subido y nadie la usa: usarla", () => {
    let draft = addAnimation(createStarterDraft());
    draft = updateAnimation(draft, draft.animations[0].id, {
      spriteSheetUrl: "https://cdn.test/x.png",
      framesCount: 4,
    });
    expect(nextStep(draft)).toBe("USE_ANIMATION");
  });

  it("todo en su sitio y sin click: agregar la transición", () => {
    let draft = addAnimation(createStarterDraft());
    draft = updateAnimation(draft, draft.animations[0].id, {
      spriteSheetUrl: "https://cdn.test/x.png",
      framesCount: 4,
      loop: true,
    });
    draft = updateState(draft, draft.states[0].id, {
      animation: draft.animations[0].key,
    });
    expect(nextStep(draft)).toBe("ADD_TRANSITION");
  });

  it("errores primero, antes que cualquier otro consejo", () => {
    let draft = addAnimation(createStarterDraft());
    draft = { ...draft, initialState: "" };
    expect(nextStep(draft)).toBe("FIX_ERRORS");
  });

  it("TV completo: nada que hacer", () => {
    expect(nextStep(tvDraft())).toBe("DONE");
  });

  it("estado sin salida: arreglar los avisos", () => {
    // OFF --(ir a ON)--> ON, y de ON no sale nada: se enciende y no se apaga.
    // Todo lo demás está en orden (la animación existe, tiene atlas y la usa
    // un estado), así que el único paso que queda es ese aviso.
    let draft = createStarterDraft();
    draft = updateState(draft, draft.states[0].id, { key: "OFF" });
    draft = addState(draft);
    draft = updateState(draft, draft.states[1].id, { key: "ON" });
    draft = addAnimation(draft);
    draft = updateAnimation(draft, draft.animations[0].id, {
      key: "brillo",
      loop: true,
      framesCount: 4,
      spriteSheetUrl: "https://cdn.test/brillo.png",
    });
    draft = updateState(draft, draft.states[1].id, { animation: "brillo" });
    draft = addTransition(draft);
    draft = updateTransition(draft, draft.transitions[0].id, {
      fromState: "OFF",
      action: "SET_STATE",
      animation: null,
      targetState: "ON",
    });

    expect(validateDraft(draft).ok).toBe(true);
    expect(describeStateCard(draft, draft.states[1]).deadEnd).toBe(true);
    expect(nextStep(draft)).toBe("FIX_NOTICES");
  });
});

// ═════════════════ consecuencias de borrar ═════════════════

describe("consecuencias de borrar", () => {
  it("borrar un estado del TV se lleva sus transiciones", () => {
    const draft = tvDraft();
    const off = draft.states.find((state) => state.key === "OFF")!;

    const impact = describeStateDeletion(draft, off.id)!;
    expect(impact.removedTransitions).toBeGreaterThan(0);
    expect(impact.harmless).toBe(false);
  });

  it("lo que anuncia el aviso es lo que hace el mutador", () => {
    const draft = tvDraft();
    const off = draft.states.find((state) => state.key === "OFF")!;

    const impact = describeStateDeletion(draft, off.id)!;
    const after = removeState(draft, off.id);

    expect(draft.transitions.length - after.transitions.length).toBe(
      impact.removedTransitions,
    );
  });

  it("avisa del cambio de estado inicial", () => {
    const draft = tvDraft();
    const initial = draft.states.find((state) => state.key === draft.initialState)!;

    const impact = describeStateDeletion(draft, initial.id)!;
    expect(impact.newInitialState).not.toBeNull();
    expect(impact.newInitialState).not.toBe(draft.initialState);
  });

  it("avisa cuando se borra el último estado", () => {
    const draft = createStarterDraft();
    const impact = describeStateDeletion(draft, draft.states[0].id)!;

    expect(impact.leavesNoStates).toBe(true);
    expect(impact.harmless).toBe(false);
  });

  it("borrar un estado suelto no se lleva nada", () => {
    let draft = tvDraft();
    draft = addState(draft);
    const suelto = draft.states[draft.states.length - 1];

    expect(describeStateDeletion(draft, suelto.id)!.harmless).toBe(true);
  });

  it("borrar una animación deja estados sin animación y quita transiciones", () => {
    const draft = tvDraft();
    // El estado ON usa screen_loop en el TV de referencia.
    const usada = draft.animations.find((animation) =>
      draft.states.some((state) => state.animation === animation.key),
    )!;

    const impact = describeAnimationDeletion(draft, usada.id)!;
    expect(impact.statesLosingAnimation.length).toBeGreaterThan(0);
    expect(impact.harmless).toBe(false);
  });

  it("borrar una animación que nadie usa es inofensivo", () => {
    let draft = tvDraft();
    draft = addAnimation(draft);
    const nueva = draft.animations[draft.animations.length - 1];

    expect(describeAnimationDeletion(draft, nueva.id)!.harmless).toBe(true);
  });

  it("una fila que no existe no describe nada", () => {
    expect(describeStateDeletion(tvDraft(), "no-existe")).toBeNull();
    expect(describeAnimationDeletion(tvDraft(), "no-existe")).toBeNull();
  });

  it("apagar el comportamiento cuenta todo lo que se pierde", () => {
    const draft = tvDraft();
    const impact = describeDisableImpact(draft);

    expect(impact.states).toBe(draft.states.length);
    expect(impact.animations).toBe(draft.animations.length);
    expect(impact.transitions).toBe(draft.transitions.length);
    expect(impact.harmless).toBe(false);
  });

  it("apagar un comportamiento recién activado no destruye nada relevante", () => {
    expect(describeDisableImpact(createEmptyDraft()).harmless).toBe(true);
  });

  it("el estado IDLE que crea el interruptor no cuenta como algo que perder", () => {
    // Regresión de la Fase 11: el primer click en una plantilla abría un
    // diálogo de confirmación para no perder un estado que el creador no había
    // escrito — lo había puesto `createStarterDraft()` un segundo antes.
    expect(describeDisableImpact(createStarterDraft()).harmless).toBe(true);
  });

  it("en cuanto hay una animación o un click, apagar sí avisa", () => {
    expect(describeDisableImpact(addAnimation(createStarterDraft())).harmless).toBe(
      false,
    );
    expect(describeDisableImpact(addTransition(createStarterDraft())).harmless).toBe(
      false,
    );
  });

  it("dos estados ya son trabajo del creador", () => {
    expect(describeDisableImpact(addState(createStarterDraft())).harmless).toBe(false);
  });
});

// ═════════════════ resúmenes ═════════════════

describe("resúmenes", () => {
  it("resume una plantilla del paquete", () => {
    expect(summarizeBehavior(DOOR_BEHAVIOR)).toEqual({
      states: DOOR_BEHAVIOR.states.length,
      animations: DOOR_BEHAVIOR.animations.length,
      transitions: DOOR_BEHAVIOR.transitions.length,
      interactive: true,
    });
  });

  it("resume el draft en edición", () => {
    expect(summarizeDraft(createStarterDraft())).toEqual({
      states: 1,
      animations: 0,
      transitions: 0,
      interactive: false,
    });
  });
});

// ═════════════════ cambios sin guardar ═════════════════

describe("draftFingerprint / isDraftDirty", () => {
  it("dos drafts iguales con ids distintos no son un cambio", () => {
    // Los ids de fila son de React: se regeneran al releer del backend.
    const a = draftFromTemplate(TV_BEHAVIOR);
    const b = draftFromTemplate(TV_BEHAVIOR);

    expect(a.states[0].id).not.toBe(b.states[0].id);
    expect(isDraftDirty(a, b)).toBe(false);
  });

  it("renombrar un estado sí es un cambio", () => {
    const a = tvDraft();
    const b = updateState(a, a.states[0].id, { key: "APAGADO" });

    expect(isDraftDirty(a, b)).toBe(true);
  });

  it("subir un atlas es un cambio", () => {
    const a = addAnimation(createStarterDraft());
    const b = updateAnimation(a, a.animations[0].id, {
      spriteSheetUrl: "https://cdn.test/x.png",
      framesCount: 4,
    });

    expect(isDraftDirty(a, b)).toBe(true);
  });

  it("apagar el comportamiento es un cambio", () => {
    expect(isDraftDirty(tvDraft(), createEmptyDraft())).toBe(true);
  });

  it("dos objetos estáticos son iguales aunque vengan de drafts distintos", () => {
    expect(draftFingerprint(createEmptyDraft())).toBe(
      draftFingerprint({ ...tvDraft(), enabled: false }),
    );
  });
});

// ═════════════════ selección de frames ═════════════════

describe("describeFrameSelection", () => {
  it("orden natural: frame_2 antes que frame_10", () => {
    expect(sortFrameNames(["frame_10.png", "frame_2.png", "frame_1.png"])).toEqual([
      "frame_1.png",
      "frame_2.png",
      "frame_10.png",
    ]);
  });

  it("4 archivos, una cara: 4 frames", () => {
    const selection = describeFrameSelection(["a.png", "b.png", "c.png", "d.png"], 1);
    expect(selection.framesCount).toBe(4);
    expect(selection.ok).toBe(true);
    expect(selection.problem).toBe("NONE");
  });

  it("8 archivos, 4 caras: 2 frames por cara", () => {
    const names = Array.from({ length: 8 }, (_unused, index) => `f${index}.png`);
    const selection = describeFrameSelection(names, 4);

    expect(selection.rows).toBe(4);
    expect(selection.framesCount).toBe(2);
    expect(selection.ok).toBe(true);
  });

  it("sin archivos no se puede subir", () => {
    const selection = describeFrameSelection([], 1);
    expect(selection.problem).toBe("EMPTY");
    expect(selection.ok).toBe(false);
  });

  it("dice cuántos archivos faltan para completar las caras", () => {
    const selection = describeFrameSelection(["a.png", "b.png", "c.png"], 4);

    expect(selection.problem).toBe("NOT_MULTIPLE");
    expect(selection.missingForNextRow).toBe(1);
    expect(selection.ok).toBe(false);
  });

  it("frena el exceso de frames antes de subirlos", () => {
    const names = Array.from({ length: 40 }, (_unused, index) => `f${index}.png`);
    const selection = describeFrameSelection(names, 1);

    expect(selection.problem).toBe("TOO_MANY");
    expect(selection.ok).toBe(false);
  });

  it("devuelve los nombres ya ordenados, que es el orden de los frames", () => {
    expect(describeFrameSelection(["b.png", "a.png"], 1).names).toEqual([
      "a.png",
      "b.png",
    ]);
  });

  it("caras inválidas se tratan como una sola", () => {
    expect(describeFrameSelection(["a.png"], 0).rows).toBe(1);
    expect(describeFrameSelection(["a.png"], Number.NaN).rows).toBe(1);
  });
});

// ═════════════════ hoja de la animación (Fase 11) ═════════════════

describe("sheetPreviewGeometry", () => {
  it("un sprite de 32×48 con 5 frames y 4 caras NO se trata como 64×64", () => {
    // Regresión de la QA de navegador: la tarjeta asumía 64×64 y dibujaba la
    // hoja estirada y con la grilla corrida.
    const geometry = sheetPreviewGeometry(
      { framesCount: 5, directional: true },
      { width: 5 * 32, height: 4 * 48 },
      4,
    );

    expect(geometry).toEqual({ frameWidth: 32, frameHeight: 48, cols: 5, rows: 4 });
  });

  it("una animación no direccional tiene una sola fila", () => {
    const geometry = sheetPreviewGeometry(
      { framesCount: 4, directional: false },
      { width: 4 * 17, height: 93 },
      4,
    );

    expect(geometry).toEqual({ frameWidth: 17, frameHeight: 93, cols: 4, rows: 1 });
  });

  it("aún sin medir el PNG no inventa una celda", () => {
    expect(
      sheetPreviewGeometry({ framesCount: 5, directional: true }, null, 4),
    ).toBeNull();
  });

  it("un atlas que no casa con sus frames devuelve null en vez de recortar mal", () => {
    // 161 px de ancho no se reparte en 5 columnas.
    expect(
      sheetPreviewGeometry(
        { framesCount: 5, directional: false },
        { width: 161, height: 48 },
        1,
      ),
    ).toBeNull();
  });

  it("da lo mismo que la geometría que usa la prueba del editor", () => {
    // Una sola derivación para tarjeta, prueba y juego: si divergen, el
    // creador vería en la tarjeta una celda distinta de la de la sala.
    const animation = {
      key: "turn_on",
      row: 0,
      startCol: 0,
      framesCount: 5,
      fps: 12,
      loop: false,
      directional: true,
      spriteSheetUrl: null,
    };
    const atlas = { width: 160, height: 192 };

    expect(sheetPreviewGeometry(animation, atlas, 4)).toEqual(
      resolveAtlasGeometry(animation, atlas, 4),
    );
  });
});
