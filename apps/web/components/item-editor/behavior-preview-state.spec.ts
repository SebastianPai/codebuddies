import {
  BATHTUB_BEHAVIOR,
  DOOR_BEHAVIOR,
  PALM_BEHAVIOR,
  TV_BEHAVIOR,
  type WorldBehavior,
} from "@codebuddies/world-objects";

import {
  advancePreview,
  canPreview,
  createPreviewState,
  describePreview,
  previewFromState,
  resetPreview,
  setPreviewDirection,
  setPreviewPlaying,
  setPreviewSpeed,
  triggerPreview,
  type AtlasSize,
  type PreviewState,
} from "./behavior-preview-state";

/**
 * Simulación de la preview.
 *
 * Reloj totalmente controlado: `advancePreview` recibe el delta, así que no
 * hay un solo `setTimeout` ni un `Date.now()` en todo el archivo. Cada test
 * dice exactamente cuánto tiempo pasa.
 */

// Duraciones reales de los behaviors de referencia.
const TURN_MS = (5 * 1000) / 12; // turn_on / turn_off
const SCREEN_FRAME_MS = 1000 / 8; // screen_loop: 8 fps
const WATER_START_MS = (6 * 1000) / 12;
const WATER_STOP_MS = (5 * 1000) / 12;
const DOOR_MS = (6 * 1000) / 14;

/** El entero siguiente a una frontera de frame: es lo que hace un reloj real. */
const after = (ms: number) => Math.ceil(ms);

/** Atlas con su propio PNG por animación, como produce el generador. */
function withAtlases(behavior: WorldBehavior, directional = false): WorldBehavior {
  return {
    ...behavior,
    animations: behavior.animations.map((animation) => ({
      ...animation,
      row: 0,
      startCol: 0,
      directional,
      spriteSheetUrl: `https://cdn.test/${animation.key}.png`,
    })),
  };
}

/** Medidas del PNG de una animación: `framesCount` columnas × `rows` filas. */
function atlasFor(
  behavior: WorldBehavior,
  animationKey: string | null,
  rows = 1,
  cell = { w: 32, h: 48 },
): AtlasSize | null {
  const animation = behavior.animations.find((item) => item.key === animationKey);
  if (!animation) return null;
  return { width: animation.framesCount * cell.w, height: rows * cell.h };
}

/** Avanza la simulación en pasos de 16 ms, como un bucle de 60 fps. */
function run(
  behavior: WorldBehavior,
  state: PreviewState,
  totalMs: number,
  step = 16,
): PreviewState {
  let current = state;
  let elapsed = 0;
  while (elapsed < totalMs) {
    const delta = Math.min(step, totalMs - elapsed);
    current = advancePreview(behavior, current, delta);
    elapsed += delta;
  }
  return current;
}

/** Atajo: qué muestra la preview ahora mismo. */
function snapshot(
  behavior: WorldBehavior,
  state: PreviewState,
  rows = 1,
  directions = 1,
) {
  const animationKey = describePreview(behavior, state, null, directions).animationKey;
  return describePreview(
    behavior,
    state,
    atlasFor(behavior, animationKey, rows),
    directions,
  );
}

// ═══════════════════════════ preview básica ═══════════════════════════

describe("preview básica", () => {
  const tv = withAtlases(TV_BEHAVIOR);

  it("arranca en el estado inicial", () => {
    const state = createPreviewState(tv);
    expect(snapshot(tv, state).stateKey).toBe("OFF");
    expect(state.clock).toBe(0);
    expect(state.playing).toBe(true);
  });

  it("un estado estático muestra su animación de un frame y no avanza", () => {
    const state = run(tv, createPreviewState(tv), 5_000);
    const view = snapshot(tv, state);

    expect(view.stateKey).toBe("OFF");
    expect(view.animationKey).toBe("off");
    expect(view.frame).toBe(0);
    expect(view.framesCount).toBe(1);
  });

  it("un estado sin animación se describe sin romperse", () => {
    const behavior: WorldBehavior = {
      version: 1,
      initialState: "IDLE",
      states: [{ key: "IDLE", animation: null }],
      animations: [],
      transitions: [],
    };
    const view = describePreview(behavior, createPreviewState(behavior), null, 1);

    expect(view.stateKey).toBe("IDLE");
    expect(view.animationKey).toBeNull();
    expect(view.frame).toBe(-1);
    expect(view.cell).toBeNull();
  });

  it("un estado animado recorre sus frames", () => {
    const palm = withAtlases(PALM_BEHAVIOR);
    let state = createPreviewState(palm);
    const perFrame = 1000 / 6; // idle_loop: 6 fps

    expect(snapshot(palm, state).frame).toBe(0);

    state = run(palm, state, after(perFrame));
    expect(snapshot(palm, state).frame).toBe(1);

    state = run(palm, state, after(perFrame * 2) - after(perFrame));
    expect(snapshot(palm, state).frame).toBe(2);
  });

  it("un loop vuelve al frame inicial y sigue indefinidamente", () => {
    const palm = withAtlases(PALM_BEHAVIOR);
    const perFrame = 1000 / 6;

    // 6 frames: tras una vuelta completa vuelve al 0.
    let state = run(palm, createPreviewState(palm), after(perFrame * 6));
    expect(snapshot(palm, state).frame).toBe(0);

    // Y varias vueltas después sigue vivo, sin tope artificial.
    state = run(palm, state, after(perFrame * 6) * 20);
    expect(snapshot(palm, state).frame).toBeGreaterThanOrEqual(0);
    expect(snapshot(palm, state).animationKey).toBe("idle_loop");
  });
});

// ═══════════════════════════ click y transiciones ═══════════════════════════

describe("probar click", () => {
  const tv = withAtlases(TV_BEHAVIOR);

  it("la transición sale del contrato, no de un if", () => {
    const state = triggerPreview(tv, createPreviewState(tv));
    const view = snapshot(tv, state);

    expect(view.inTransition).toBe(true);
    expect(view.animationKey).toBe("turn_on");
    // El estado estable sigue siendo OFF mientras dura la animación de paso.
    expect(view.stateKey).toBe("OFF");
  });

  it("al terminar la transición entra el estado destino y su loop", () => {
    let state = triggerPreview(tv, createPreviewState(tv));
    state = run(tv, state, after(TURN_MS));

    const view = snapshot(tv, state);
    expect(view.stateKey).toBe("ON");
    expect(view.inTransition).toBe(false);
    // No se queda clavada en el último frame de turn_on.
    expect(view.animationKey).toBe("screen_loop");
  });

  it("un click sin transición desde ese estado se marca como ignorado", () => {
    const palm = withAtlases(PALM_BEHAVIOR);
    const state = triggerPreview(palm, createPreviewState(palm));

    expect(state.lastClick).toEqual({
      from: "IDLE",
      via: null,
      to: "IDLE",
      ignored: true,
      busy: false,
    });
    expect(snapshot(palm, state).stateKey).toBe("IDLE");
  });

  it("un click durante una transición no arranca otra", () => {
    let state = triggerPreview(tv, createPreviewState(tv));
    state = run(tv, state, 50);
    const startedAt = state.runtime.playing?.startedAt;

    state = triggerPreview(tv, state);
    // Ocupado, no "no reacciona": son dos motivos distintos y se distinguen.
    expect(state.lastClick?.busy).toBe(true);
    expect(state.lastClick?.ignored).toBe(false);
    expect(state.runtime.playing?.startedAt).toBe(startedAt);
  });
});

// ═══════════════════════════ pausa, velocidad, reset ═══════════════════════════

describe("controles de la simulación", () => {
  const tv = withAtlases(TV_BEHAVIOR);

  it("en pausa el reloj no avanza y el estado se conserva", () => {
    let state = triggerPreview(tv, createPreviewState(tv));
    state = run(tv, state, 100);
    const paused = setPreviewPlaying(state, false);

    const later = run(tv, paused, 10_000);

    expect(later.clock).toBe(paused.clock);
    expect(later.runtime).toBe(paused.runtime);
    expect(snapshot(tv, later).animationKey).toBe("turn_on");
  });

  it("al reanudar continúa desde el mismo punto, no desde el principio", () => {
    let state = triggerPreview(tv, createPreviewState(tv));
    state = run(tv, state, 100);
    const frameBefore = snapshot(tv, state).frame;

    state = setPreviewPlaying(state, false);
    state = run(tv, state, 5_000); // en pausa: no pasa nada
    state = setPreviewPlaying(state, true);

    expect(snapshot(tv, state).frame).toBe(frameBefore);

    // Y sigue avanzando desde ahí.
    state = run(tv, state, after(TURN_MS));
    expect(snapshot(tv, state).stateKey).toBe("ON");
  });

  it("la velocidad multiplica el reloj, sin tocar el fps del comportamiento", () => {
    const fast = run(tv, setPreviewSpeed(createPreviewState(tv), 2), 1_000);
    const slow = run(tv, setPreviewSpeed(createPreviewState(tv), 0.5), 1_000);

    expect(fast.clock).toBeCloseTo(2_000, 5);
    expect(slow.clock).toBeCloseTo(500, 5);
    // El dato del objeto no se toca: sigue siendo 12 fps.
    expect(tv.animations.find((a) => a.key === "turn_on")!.fps).toBe(12);
  });

  it("a 2x la transición termina en la mitad de tiempo real", () => {
    let state = setPreviewSpeed(createPreviewState(tv), 2);
    state = triggerPreview(tv, state);
    state = run(tv, state, after(TURN_MS / 2));

    expect(snapshot(tv, state).stateKey).toBe("ON");
  });

  it("reiniciar vuelve al estado inicial y borra la transición", () => {
    let state = triggerPreview(tv, createPreviewState(tv));
    state = run(tv, state, 100);

    const reset = resetPreview(tv, state);

    expect(reset.clock).toBe(0);
    expect(reset.runtime.playing).toBeNull();
    expect(snapshot(tv, reset).stateKey).toBe("OFF");
    expect(snapshot(tv, reset).frame).toBe(0);
  });

  it("reiniciar conserva velocidad y dirección", () => {
    let state = setPreviewSpeed(createPreviewState(tv), 2);
    state = setPreviewDirection(state, 3);

    const reset = resetPreview(tv, state);
    expect(reset.speed).toBe(2);
    expect(reset.direction).toBe(3);
  });

  it("previsualizar un estado concreto no toca el initialState", () => {
    const state = previewFromState(tv, createPreviewState(tv), "ON");

    expect(snapshot(tv, state).stateKey).toBe("ON");
    expect(snapshot(tv, state).animationKey).toBe("screen_loop");
    // El comportamiento sigue arrancando en OFF.
    expect(tv.initialState).toBe("OFF");
  });

  it("previsualizar un estado inexistente cae al inicial", () => {
    const state = previewFromState(tv, createPreviewState(tv), "FANTASMA");
    expect(snapshot(tv, state).stateKey).toBe("OFF");
  });
});

// ═══════════════════════════ objetos completos ═══════════════════════════

describe("TV: ciclo completo", () => {
  const tv = withAtlases(TV_BEHAVIOR);

  it("OFF → turn_on → ON → screen_loop → turn_off → OFF", () => {
    let state = createPreviewState(tv);
    expect(snapshot(tv, state)).toMatchObject({ stateKey: "OFF", animationKey: "off" });

    // ── primer click ──
    state = triggerPreview(tv, state);
    state = run(tv, state, 90);
    expect(snapshot(tv, state)).toMatchObject({
      animationKey: "turn_on",
      inTransition: true,
      frame: 1,
    });

    state = run(tv, state, after(TURN_MS) - 90);
    expect(snapshot(tv, state)).toMatchObject({
      stateKey: "ON",
      animationKey: "screen_loop",
      inTransition: false,
    });

    // screen_loop corre indefinidamente.
    state = run(tv, state, after(SCREEN_FRAME_MS));
    expect(snapshot(tv, state).frame).toBe(1);
    state = run(tv, state, after(SCREEN_FRAME_MS * 4) - after(SCREEN_FRAME_MS));
    expect(snapshot(tv, state).frame).toBe(0);

    // ── segundo click: la transición inversa ──
    state = triggerPreview(tv, state);
    expect(state.lastClick).toMatchObject({
      from: "ON",
      via: "turn_off",
      to: "OFF",
      ignored: false,
      busy: false,
    });
    expect(snapshot(tv, state).animationKey).toBe("turn_off");

    state = run(tv, state, after(TURN_MS));
    expect(snapshot(tv, state)).toMatchObject({
      stateKey: "OFF",
      animationKey: "off",
      inTransition: false,
    });
  });
});

describe("bañera: el loop no impide la segunda interacción", () => {
  const tub = withAtlases(BATHTUB_BEHAVIOR);

  it("IDLE → water_start → FILLING(water_loop) → water_stop → IDLE", () => {
    let state = createPreviewState(tub);
    expect(snapshot(tub, state).animationKey).toBe("idle");

    state = triggerPreview(tub, state);
    expect(snapshot(tub, state).animationKey).toBe("water_start");

    state = run(tub, state, after(WATER_START_MS));
    expect(snapshot(tub, state)).toMatchObject({
      stateKey: "FILLING",
      animationKey: "water_loop",
    });

    // El agua corre un buen rato sin que nada se rompa.
    state = run(tub, state, 30_000);
    expect(snapshot(tub, state).animationKey).toBe("water_loop");

    // Y el loop NO bloquea el segundo click.
    state = triggerPreview(tub, state);
    expect(state.lastClick?.ignored).toBe(false);
    expect(snapshot(tub, state).animationKey).toBe("water_stop");

    state = run(tub, state, after(WATER_STOP_MS));
    expect(snapshot(tub, state)).toMatchObject({
      stateKey: "IDLE",
      animationKey: "idle",
    });
  });
});

describe("puerta", () => {
  const door = withAtlases(DOOR_BEHAVIOR);

  it("CLOSED → opening → OPEN → closing → CLOSED", () => {
    let state = createPreviewState(door);
    expect(snapshot(door, state).animationKey).toBe("closed");

    state = triggerPreview(door, state);
    expect(snapshot(door, state).animationKey).toBe("opening");

    state = run(door, state, after(DOOR_MS));
    expect(snapshot(door, state)).toMatchObject({
      stateKey: "OPEN",
      animationKey: "open",
    });

    state = triggerPreview(door, state);
    expect(snapshot(door, state).animationKey).toBe("closing");

    state = run(door, state, after(DOOR_MS));
    expect(snapshot(door, state)).toMatchObject({
      stateKey: "CLOSED",
      animationKey: "closed",
    });
  });
});

// ═══════════════════════════ direcciones ═══════════════════════════

describe("direcciones", () => {
  it("una animación NO direccional ignora la dirección elegida", () => {
    const palm = withAtlases(PALM_BEHAVIOR, false);
    const state = setPreviewDirection(createPreviewState(palm), 3);
    const view = snapshot(palm, state, 1, 4);

    expect(view.directionCount).toBe(1);
    expect(view.cell!.row).toBe(0);
  });

  it("una animación direccional selecciona la fila de la dirección", () => {
    const tv = withAtlases(TV_BEHAVIOR, true);

    for (const direction of [0, 1, 2, 3]) {
      const state = setPreviewDirection(createPreviewState(tv), direction);
      const view = snapshot(tv, state, 4, 4);

      expect(view.directionCount).toBe(4);
      expect(view.cell!.row).toBe(direction);
    }
  });

  it("la dirección se recorta a las filas que existen de verdad", () => {
    // El objeto declara 4 caras pero el atlas sólo tiene 1 fila.
    const tv = withAtlases(TV_BEHAVIOR, true);
    const state = setPreviewDirection(createPreviewState(tv), 3);
    const view = snapshot(tv, state, 1, 4);

    expect(view.directionCount).toBe(1);
    expect(view.cell!.row).toBe(0);
  });

  it("la columna sigue siendo el frame, independientemente de la fila", () => {
    const tv = withAtlases(TV_BEHAVIOR, true);
    let state = setPreviewDirection(createPreviewState(tv), 2);
    state = triggerPreview(tv, state);
    state = run(tv, state, 90); // turn_on frame 1

    const view = snapshot(tv, state, 4, 4);
    expect(view.cell).toEqual({ row: 2, col: 1 });
  });
});

// ═══════════════════════════ frames y geometría ═══════════════════════════

describe("frames y proporciones", () => {
  const tv = withAtlases(TV_BEHAVIOR);

  it("informa frame y total para mostrar '3 / 5'", () => {
    let state = triggerPreview(tv, createPreviewState(tv));
    state = run(tv, state, after((2 * 1000) / 12));

    const view = snapshot(tv, state);
    expect(view.framesCount).toBe(5);
    expect(view.frame).toBe(2);
  });

  it("el último frame de una animación no-loop se mantiene", () => {
    // turn_on tiene 5 frames; justo antes de terminar está en el 4.
    let state = triggerPreview(tv, createPreviewState(tv));
    state = run(tv, state, after(TURN_MS) - 2);

    expect(snapshot(tv, state).frame).toBe(4);
  });

  it("respeta proporciones NO cuadradas", () => {
    // Un sprite de 17x93, como el que ya apareció en la Fase 4.
    const palm = withAtlases(PALM_BEHAVIOR);
    const atlas = { width: 17 * 6, height: 93 };
    const view = describePreview(palm, createPreviewState(palm), atlas, 1);

    expect(view.geometry).toEqual({
      frameWidth: 17,
      frameHeight: 93,
      rows: 1,
      cols: 6,
    });
  });

  it("no fuerza 64x64 ni asume frames cuadrados", () => {
    const palm = withAtlases(PALM_BEHAVIOR);
    const view = describePreview(
      palm,
      createPreviewState(palm),
      { width: 6 * 40, height: 24 },
      1,
    );

    expect(view.geometry!.frameWidth).toBe(40);
    expect(view.geometry!.frameHeight).toBe(24);
  });
});

// ═══════════════════════════ robustez ═══════════════════════════

describe("robustez", () => {
  it("un behavior inválido no se puede previsualizar, y se dice", () => {
    const broken = { ...TV_BEHAVIOR, initialState: "FANTASMA" };
    expect(canPreview(broken)).toBe(false);
  });

  it("un estado inexistente cae al inicial en vez de romper", () => {
    const tv = withAtlases(TV_BEHAVIOR);
    const state: PreviewState = {
      ...createPreviewState(tv),
      runtime: { stateKey: "NO_EXISTE", stateSince: 0, playing: null },
    };

    expect(() => describePreview(tv, state, null, 1)).not.toThrow();
    expect(snapshot(tv, state).stateKey).toBe("OFF");
  });

  it("una animación inexistente en la transición se asienta sola", () => {
    const tv = withAtlases(TV_BEHAVIOR);
    let state: PreviewState = {
      ...createPreviewState(tv),
      runtime: {
        stateKey: "OFF",
        stateSince: 0,
        playing: {
          animationKey: "fantasma",
          startedAt: 0,
          onComplete: { action: "SET_STATE", state: "ON" },
        },
      },
    };

    state = run(tv, state, 32);
    expect(snapshot(tv, state).stateKey).toBe("ON");
  });

  it("sin atlas todavía: hay estado lógico pero no celda", () => {
    // Asset cargando. La máquina NO se detiene por eso (lección de Fase 5).
    const tv = withAtlases(TV_BEHAVIOR);
    let state = triggerPreview(tv, createPreviewState(tv));

    let view = describePreview(tv, state, null, 1);
    expect(view.animationKey).toBe("turn_on");
    expect(view.cell).toBeNull();

    state = run(tv, state, after(TURN_MS));
    view = describePreview(tv, state, null, 1);
    expect(view.stateKey).toBe("ON");
  });

  it("una animación sin spriteSheetUrl se describe sin celda", () => {
    const view = describePreview(PALM_BEHAVIOR, createPreviewState(PALM_BEHAVIOR), null, 1);

    expect(view.animationKey).toBe("idle_loop");
    expect(view.spriteSheetUrl).toBeNull();
    expect(view.cell).toBeNull();
  });

  it("un atlas cuyo tamaño no casa con framesCount no produce celda", () => {
    // 6 frames declarados en un PNG de 100 px: no divide.
    const palm = withAtlases(PALM_BEHAVIOR);
    const view = describePreview(palm, createPreviewState(palm), { width: 100, height: 48 }, 1);

    expect(view.geometry).toBeNull();
    expect(view.cell).toBeNull();
    // Pero el estado lógico sigue siendo correcto.
    expect(view.stateKey).toBe("IDLE");
    expect(view.frame).toBe(0);
  });

  it("un atlas de UNA fila no se parte en 4 por ser divisible", () => {
    const tv = withAtlases(TV_BEHAVIOR, true);
    // 48 px de alto son divisibles entre 4, pero darían celdas de 12 px.
    const view = describePreview(
      tv,
      createPreviewState(tv),
      { width: 1 * 32, height: 48 },
      4,
    );

    expect(view.geometry!.rows).toBe(1);
    expect(view.cell!.row).toBe(0);
  });

  it("medidas de atlas absurdas se descartan sin lanzar", () => {
    const palm = withAtlases(PALM_BEHAVIOR);
    for (const atlas of [
      { width: 0, height: 0 },
      { width: -10, height: 48 },
      { width: Number.NaN, height: 48 },
    ]) {
      expect(() => describePreview(palm, createPreviewState(palm), atlas, 1)).not.toThrow();
      expect(describePreview(palm, createPreviewState(palm), atlas, 1).cell).toBeNull();
    }
  });

  it("un delta negativo o no numérico no mueve el reloj", () => {
    const tv = withAtlases(TV_BEHAVIOR);
    const state = createPreviewState(tv);

    expect(advancePreview(tv, state, -100).clock).toBe(0);
    expect(advancePreview(tv, state, Number.NaN).clock).toBe(0);
  });
});

// ═══════════════════════ qué contar del último click (Fase 10) ═══════════════════════

describe("último click de prueba", () => {
  const tv = withAtlases(TV_BEHAVIOR);

  it("recién creada la simulación, todavía no se probó nada", () => {
    expect(createPreviewState(tv).lastClick).toBeNull();
  });

  it("un click aceptado cuenta de dónde sale, por dónde pasa y dónde termina", () => {
    const state = triggerPreview(tv, createPreviewState(tv));

    expect(state.lastClick).toEqual({
      from: "OFF",
      via: "turn_on",
      to: "ON",
      ignored: false,
      busy: false,
    });
  });

  it("una transición sin animación de paso no inventa una", () => {
    // La puerta usa PLAY_ANIMATION; se construye el caso directo a mano para
    // comprobar que `via` queda en null cuando la acción es ir al estado.
    const direct: WorldBehavior = {
      version: 1,
      initialState: "A",
      states: [
        { key: "A", animation: null },
        { key: "B", animation: null },
      ],
      animations: [],
      transitions: [
        { trigger: "CLICK", fromState: "A", action: "SET_STATE", state: "B" },
      ],
    };

    const state = triggerPreview(direct, createPreviewState(direct));
    expect(state.lastClick).toEqual({
      from: "A",
      via: null,
      to: "B",
      ignored: false,
      busy: false,
    });
  });

  it("reiniciar la prueba borra el último click", () => {
    let state = triggerPreview(tv, createPreviewState(tv));
    expect(state.lastClick).not.toBeNull();

    state = resetPreview(tv, state);
    expect(state.lastClick).toBeNull();
  });

  it("arrancar en un estado concreto tampoco arrastra el click anterior", () => {
    let state = triggerPreview(tv, createPreviewState(tv));
    state = previewFromState(tv, state, "ON");

    expect(state.lastClick).toBeNull();
  });

  it("el click de la puerta cuenta su animación de paso", () => {
    const door = withAtlases(DOOR_BEHAVIOR);
    const state = triggerPreview(door, createPreviewState(door));

    expect(state.lastClick?.via).toBe("opening");
    expect(state.lastClick?.to).toBe("OPEN");
  });

  it("pausar no borra lo que contó el último click", () => {
    let state = triggerPreview(tv, createPreviewState(tv));
    const before = state.lastClick;

    state = setPreviewPlaying(state, false);
    state = setPreviewSpeed(state, 2);
    state = setPreviewDirection(state, 1);

    expect(state.lastClick).toEqual(before);
  });
});
