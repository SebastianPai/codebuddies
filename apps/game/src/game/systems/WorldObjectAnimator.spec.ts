import {
  BATHTUB_BEHAVIOR,
  DOOR_BEHAVIOR,
  PALM_BEHAVIOR,
  TV_BEHAVIOR,
  type RemoteStateUpdate,
} from "@codebuddies/world-objects";

import WorldObjectAnimator, {
  type AnimatableObject,
  type AnimatorTextures,
} from "./WorldObjectAnimator";

/**
 * Ejecutor visual de world objects.
 *
 * No hay Phaser en ninguna parte: el animator importa sus tipos con
 * `import type` (se borran al compilar) y recibe el cargador de texturas por
 * constructor, así que acá basta con dobles mínimos. Mismo criterio que
 * NavGrid.spec.ts, que prueba la navegación con un doble de IsoGrid.
 *
 * Se ejecutan con el Jest que ya existe en apps/api:
 *
 *   cd apps/api && npx jest --config \
 *     ../../packages/world-objects/jest.config.js   (ver cabecera de ese archivo)
 *
 * o apuntándolo a este directorio con un tsconfig válido — ver
 * NavGrid.spec.ts.
 */

/**
 * Duraciones de las animaciones de referencia, redondeadas HACIA ARRIBA.
 *
 * `5 frames / 12 fps` son 416,66… ms. Sondear en ese instante exacto cae justo
 * en la frontera del último frame, donde el resultado lo decide el error de
 * coma flotante y no la lógica. En el juego `now` son milisegundos enteros, así
 * que "ya terminó" es siempre el entero siguiente: 417.
 */
const after = (ms: number) => Math.ceil(ms);

const TURN_MS = after((5 * 1000) / 12); // turn_on / turn_off: 5 frames a 12 fps
const WATER_START_MS = after((6 * 1000) / 12);
const WATER_STOP_MS = after((5 * 1000) / 12);
const DOOR_MS = after((6 * 1000) / 14); // opening / closing: 6 frames a 14 fps

const T0 = 1_700_000_000_000;

/** Atlas simulado: ancho = framesCount · alto = filas. */
type FakeTexture = {
  key: string;
  width: number;
  height: number;
  frames: Map<string, { x: number; y: number; w: number; h: number }>;
};

function makeTextures() {
  const store = new Map<string, FakeTexture>();

  const api: AnimatorTextures = {
    exists: (key) => store.has(key),
    get: (key) => {
      const texture = store.get(key);
      return {
        has: (name: string) => !!texture?.frames.has(name),
        add: (name, _i, x, y, w, h) => texture?.frames.set(name, { x, y, w, h }),
        get width() {
          return texture?.width;
        },
        get height() {
          return texture?.height;
        },
      };
    },
  };

  return {
    api,
    /** Registra un atlas de `cols x rows` celdas de 32x48. */
    add(key: string, cols: number, rows: number, cellW = 32, cellH = 48) {
      store.set(key, {
        key,
        width: cols * cellW,
        height: rows * cellH,
        frames: new Map(),
      });
    },
    frameOf(key: string, name: string) {
      return store.get(key)?.frames.get(name);
    },
  };
}

/** Sprite simulado que registra todo lo que le hacen. */
function makeSprite(baseKey = "base-texture") {
  const calls: Array<{ method: string; key?: string; frame?: string }> = [];
  const sprite = {
    texture: { key: baseKey },
    frame: { name: "base-texture-room-0" },
    setTexture(key: string, frame?: string) {
      sprite.texture = { key };
      if (frame) sprite.frame = { name: frame };
      calls.push({ method: "setTexture", key, frame });
      return sprite;
    },
    setFrame(frame: string) {
      sprite.frame = { name: frame };
      calls.push({ method: "setFrame", frame });
      return sprite;
    },
  };
  return { sprite, calls, get currentFrame() { return sprite.frame.name; } };
}

type Harness = ReturnType<typeof makeHarness>;

function makeHarness(options: {
  behavior: unknown;
  state?: unknown;
  rotation?: number;
  directions?: number;
  /** Atlas a registrar: clave de animación -> [cols, rows]. */
  atlases?: Record<string, [number, number]>;
  /** urls cuya carga nunca resuelve (simula textura en vuelo). */
  neverLoads?: string[];
  /** urls cuya carga falla. */
  failsToLoad?: string[];
}) {
  const textures = makeTextures();
  const spriteHarness = makeSprite();
  const loadRequests: string[] = [];
  const pending: Array<() => void> = [];

  // Cada animación tiene su propio atlas, como produce el generador de Fase 2.
  const atlases = options.atlases ?? {};
  for (const [animationKey, [cols, rows]] of Object.entries(atlases)) {
    textures.add(urlFor(animationKey), cols, rows);
  }

  const loadTexture = (url: string) => {
    loadRequests.push(url);
    if (options.neverLoads?.includes(url)) return new Promise<string>(() => {});
    if (options.failsToLoad?.includes(url)) return Promise.reject(new Error("404"));
    return new Promise<string>((resolve) => pending.push(() => resolve(url)));
  };

  const animator = new WorldObjectAnimator(textures.api, loadTexture);

  const object: AnimatableObject = {
    roomItemId: "item-1",
    rotation: options.rotation ?? 0,
    state: options.state ?? null,
    item: {
      worldData: {
        behavior: options.behavior,
        directions: options.directions ?? 1,
      },
    },
    sprite: spriteHarness.sprite,
  };

  return {
    animator,
    object,
    textures,
    loadRequests,
    sprite: spriteHarness,
    /** Resuelve las cargas de textura pendientes. */
    async flushLoads() {
      const queued = pending.splice(0);
      queued.forEach((resolve) => resolve());
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

function urlFor(animationKey: string) {
  return `https://cdn.test/atlas/${animationKey}.png`;
}

/** Marca todas las animaciones como no direccionales (una sola fila). */
function nonDirectional<T extends { animations: any[] }>(behavior: T): T {
  return {
    ...behavior,
    animations: behavior.animations.map((animation) => ({
      ...animation,
      directional: false,
    })),
  };
}

/** Behavior de referencia con un atlas por animación. */
function withAtlases<T extends { animations: any[] }>(behavior: T): T {
  return {
    ...behavior,
    animations: behavior.animations.map((animation) => ({
      ...animation,
      row: 0,
      startCol: 0,
      spriteSheetUrl: urlFor(animation.key),
    })),
  };
}

/** Registra el objeto y deja las texturas cargadas y el primer frame puesto. */
async function boot(harness: Harness, now = T0) {
  const registered = harness.animator.register(harness.object, now);
  await harness.flushLoads();
  harness.animator.update(now);
  return registered;
}

/** Celda (fila, columna) del frame actualmente puesto en el sprite. */
function cellOf(harness: Harness) {
  const name = harness.sprite.currentFrame;
  const match = /^wo-(.+)-(\d+)-(\d+)$/.exec(name);
  if (!match) return null;
  return { animation: match[1], row: Number(match[2]), col: Number(match[3]) };
}

// ═══════════════════════════════ básicos ═══════════════════════════════

describe("behavior = null: el objeto de siempre no entra al animator", () => {
  it("register() devuelve false y no toca el sprite", () => {
    const harness = makeHarness({ behavior: null });

    expect(harness.animator.register(harness.object, T0)).toBe(false);
    expect(harness.animator.has("item-1")).toBe(false);
    expect(harness.sprite.calls).toHaveLength(0);
  });

  it("update() no hace nada y no cuesta nada", () => {
    const harness = makeHarness({ behavior: null });
    harness.animator.register(harness.object, T0);

    harness.animator.update(T0 + 10_000);
    expect(harness.sprite.calls).toHaveLength(0);
  });

  it("un evento remoto sobre un objeto no registrado se ignora sin romper", () => {
    const harness = makeHarness({ behavior: null });
    harness.animator.applyRemoteState("item-1", { state: "ON" }, T0);
    expect(harness.sprite.calls).toHaveLength(0);
  });
});

describe("estado estático", () => {
  it("un estado sin animación deja el sprite base intacto", async () => {
    const behavior = {
      version: 1 as const,
      initialState: "IDLE",
      states: [{ key: "IDLE", animation: null }],
      animations: [],
      transitions: [],
    };
    const harness = makeHarness({ behavior });

    await boot(harness);

    // No se inventa ninguna animación: se queda con lo que puso
    // RoomItemsManager.
    expect(harness.sprite.currentFrame).toBe("base-texture-room-0");
  });

  it("un estado con animación de UN frame dibuja esa celda y no vuelve a tocarla", async () => {
    const harness = makeHarness({
      behavior: withAtlases(TV_BEHAVIOR),
      atlases: { off: [1, 1] },
    });

    await boot(harness);
    expect(cellOf(harness)).toEqual({ animation: "off", row: 0, col: 0 });

    const before = harness.sprite.calls.length;
    harness.animator.update(T0 + 5_000);
    // Un frame único no necesita recalcularse cada tick.
    expect(harness.sprite.calls.length).toBe(before);
  });
});

describe("loop de estado", () => {
  it("la palmera recorre sus frames en bucle", async () => {
    const harness = makeHarness({
      behavior: withAtlases(PALM_BEHAVIOR),
      atlases: { idle_loop: [6, 1] },
    });
    await boot(harness);

    // idle_loop: 6 frames a 6 fps => 166,67 ms por frame. Se sondea con el
    // entero siguiente a cada frontera, que es lo que ocurre de verdad con un
    // reloj en milisegundos.
    const at = (frame: number) => T0 + after((1000 / 6) * frame);
    expect(cellOf(harness)!.col).toBe(0);

    harness.animator.update(at(1));
    expect(cellOf(harness)!.col).toBe(1);

    harness.animator.update(at(5));
    expect(cellOf(harness)!.col).toBe(5);

    // Vuelve a empezar.
    harness.animator.update(at(6));
    expect(cellOf(harness)!.col).toBe(0);

    // Y sigue indefinidamente.
    harness.animator.update(at(13));
    expect(cellOf(harness)!.col).toBe(1);
  });
});

// ═══════════════════════════ sincronización ═══════════════════════════

describe("sincronización con el `at` del servidor", () => {
  function tvHarness() {
    return makeHarness({
      behavior: withAtlases(TV_BEHAVIOR),
      atlases: { off: [1, 1], turn_on: [5, 1], screen_loop: [4, 1], turn_off: [5, 1] },
    });
  }

  it("cliente 100 ms tarde: arranca en el frame que toca, no en el 0", async () => {
    const harness = tvHarness();
    await boot(harness);

    // turn_on: 5 frames a 12 fps => 83,33 ms por frame.
    harness.animator.applyRemoteState(
      "item-1",
      { state: "ON", via: "turn_on", at: T0 },
      T0 + 100,
    );
    await harness.flushLoads();
    harness.animator.update(T0 + 100);

    expect(cellOf(harness)).toEqual({ animation: "turn_on", row: 0, col: 1 });
  });

  it("cliente 250 ms tarde: frame 3", async () => {
    const harness = tvHarness();
    await boot(harness);

    harness.animator.applyRemoteState(
      "item-1",
      { state: "ON", via: "turn_on", at: T0 },
      T0 + 250,
    );
    await harness.flushLoads();
    harness.animator.update(T0 + 250);

    expect(cellOf(harness)).toEqual({ animation: "turn_on", row: 0, col: 3 });
  });

  it("cliente después de que terminó: salta al estado final SIN reproducir", async () => {
    const harness = tvHarness();
    await boot(harness);
    const callsBefore = harness.sprite.calls.length;

    harness.animator.applyRemoteState(
      "item-1",
      { state: "ON", via: "turn_on", at: T0 },
      T0 + TURN_MS + 1,
    );
    await harness.flushLoads();
    harness.animator.update(T0 + TURN_MS + 1);

    // Ni un solo frame de turn_on en pantalla.
    const played = harness.sprite.calls
      .slice(callsBefore)
      .some((call) => (call.frame ?? "").includes("turn_on"));
    expect(played).toBe(false);
    expect(cellOf(harness)!.animation).toBe("screen_loop");
  });

  it("dos jugadores con latencias distintas ven el MISMO frame", async () => {
    // El criterio de éxito del encargo: A recibe el evento a los 40 ms y B a
    // los 160 ms; en el instante T0+250 los dos tienen que mostrar lo mismo,
    // porque ambos cuentan desde el `at` del servidor.
    const a = tvHarness();
    const b = tvHarness();
    await boot(a);
    await boot(b);

    const update: RemoteStateUpdate = { state: "ON", via: "turn_on", at: T0 };

    a.animator.applyRemoteState("item-1", update, T0 + 40);
    await a.flushLoads();
    b.animator.applyRemoteState("item-1", update, T0 + 160);
    await b.flushLoads();

    a.animator.update(T0 + 250);
    b.animator.update(T0 + 250);

    expect(cellOf(a)).toEqual(cellOf(b));
    expect(cellOf(a)).toEqual({ animation: "turn_on", row: 0, col: 3 });
  });

  it("un `at` en el FUTURO no produce un frame negativo", async () => {
    // Reloj del cliente por detrás del servidor: pasa.
    const harness = tvHarness();
    await boot(harness);

    harness.animator.applyRemoteState(
      "item-1",
      { state: "ON", via: "turn_on", at: T0 + 5_000 },
      T0,
    );
    await harness.flushLoads();
    harness.animator.update(T0);

    expect(cellOf(harness)).toEqual({ animation: "turn_on", row: 0, col: 0 });
  });

  it("un `at` inválido se trata como ahora", async () => {
    const harness = tvHarness();
    await boot(harness);

    harness.animator.applyRemoteState(
      "item-1",
      { state: "ON", via: "turn_on", at: Number.NaN as any },
      T0,
    );
    await harness.flushLoads();
    harness.animator.update(T0);

    expect(cellOf(harness)!.animation).toBe("turn_on");
    expect(cellOf(harness)!.col).toBe(0);
  });

  it("el mismo evento dos veces no reinicia la animación", async () => {
    const harness = tvHarness();
    await boot(harness);
    const update: RemoteStateUpdate = { state: "ON", via: "turn_on", at: T0 };

    harness.animator.applyRemoteState("item-1", update, T0 + 10);
    await harness.flushLoads();
    harness.animator.update(T0 + 250);
    const first = cellOf(harness);

    // Reenvío (reconexión, evento duplicado): sigue cronometrado desde `at`.
    harness.animator.applyRemoteState("item-1", update, T0 + 250);
    harness.animator.update(T0 + 250);

    expect(cellOf(harness)).toEqual(first);
  });
});

// ═════════════════════════════ objetos completos ═════════════════════════════

describe("TV: OFF → turn_on → ON(screen_loop) → turn_off → OFF", () => {
  function tvHarness() {
    return makeHarness({
      behavior: withAtlases(TV_BEHAVIOR),
      atlases: { off: [1, 1], turn_on: [5, 1], screen_loop: [4, 1], turn_off: [5, 1] },
    });
  }

  it("recorre el ciclo completo", async () => {
    const harness = tvHarness();
    await boot(harness);
    expect(cellOf(harness)!.animation).toBe("off");

    // ── encender ──
    harness.animator.applyRemoteState(
      "item-1",
      { state: "ON", via: "turn_on", at: T0 },
      T0,
    );
    await harness.flushLoads();

    harness.animator.update(T0 + 90);
    expect(cellOf(harness)).toEqual({ animation: "turn_on", row: 0, col: 1 });

    // Al terminar turn_on entra solo el loop del estado ON.
    harness.animator.update(T0 + TURN_MS);
    expect(cellOf(harness)!.animation).toBe("screen_loop");

    // screen_loop: 4 frames a 8 fps => 125 ms por frame.
    harness.animator.update(T0 + TURN_MS + 125);
    expect(cellOf(harness)).toMatchObject({ animation: "screen_loop", col: 1 });
    harness.animator.update(T0 + TURN_MS + 500);
    expect(cellOf(harness)).toMatchObject({ animation: "screen_loop", col: 0 });

    // ── apagar ──
    const offAt = T0 + 10_000;
    harness.animator.applyRemoteState(
      "item-1",
      { state: "OFF", via: "turn_off", at: offAt },
      offAt,
    );
    await harness.flushLoads();

    harness.animator.update(offAt + 90);
    expect(cellOf(harness)).toEqual({ animation: "turn_off", row: 0, col: 1 });

    harness.animator.update(offAt + TURN_MS);
    expect(cellOf(harness)!.animation).toBe("off");
  });

  it("pide por adelantado el atlas del estado destino", async () => {
    // Sin esto, al terminar turn_on el atlas de screen_loop recién empezaría a
    // descargarse y la TV se quedaría clavada en el último frame de la
    // transición justo en el momento más visible.
    const harness = tvHarness();
    await boot(harness);
    harness.loadRequests.length = 0;

    harness.animator.applyRemoteState(
      "item-1",
      { state: "ON", via: "turn_on", at: T0 },
      T0,
    );

    expect(harness.loadRequests).toContain(urlFor("turn_on"));
    expect(harness.loadRequests).toContain(urlFor("screen_loop"));
    // Pero sólo el destino: no se descargan los ocho atlas del objeto.
    expect(harness.loadRequests).not.toContain(urlFor("turn_off"));
  });

  it("nunca hay dos animaciones a la vez sobre el mismo objeto", async () => {
    const harness = tvHarness();
    await boot(harness);

    harness.animator.applyRemoteState(
      "item-1",
      { state: "ON", via: "turn_on", at: T0 },
      T0,
    );
    await harness.flushLoads();

    // Cada tick pone UN frame de UNA animación.
    for (const offset of [0, 90, 200, TURN_MS, TURN_MS + 200]) {
      harness.animator.update(T0 + offset);
      const cell = cellOf(harness);
      expect(cell).not.toBeNull();
      expect(["turn_on", "screen_loop"]).toContain(cell!.animation);
    }
  });
});

describe("bañera: el loop intermedio", () => {
  function tubHarness(state?: unknown) {
    return makeHarness({
      behavior: withAtlases(BATHTUB_BEHAVIOR),
      state,
      atlases: { idle: [1, 1], water_start: [6, 1], water_loop: [4, 1], water_stop: [5, 1] },
    });
  }

  it("IDLE → water_start → FILLING(water_loop) → water_stop → IDLE", async () => {
    const harness = tubHarness();
    await boot(harness);
    expect(cellOf(harness)!.animation).toBe("idle");

    harness.animator.applyRemoteState(
      "item-1",
      { state: "FILLING", via: "water_start", at: T0 },
      T0,
    );
    await harness.flushLoads();
    harness.animator.update(T0 + 100);
    expect(cellOf(harness)!.animation).toBe("water_start");

    // Terminado water_start, water_loop queda corriendo solo.
    harness.animator.update(T0 + WATER_START_MS);
    expect(cellOf(harness)!.animation).toBe("water_loop");

    harness.animator.update(T0 + WATER_START_MS + 30_000);
    expect(cellOf(harness)!.animation).toBe("water_loop");

    // Cerrar: el loop se detiene y entra water_stop.
    const stopAt = T0 + 60_000;
    harness.animator.applyRemoteState(
      "item-1",
      { state: "IDLE", via: "water_stop", at: stopAt },
      stopAt,
    );
    await harness.flushLoads();

    harness.animator.update(stopAt + 100);
    expect(cellOf(harness)!.animation).toBe("water_stop");

    harness.animator.update(stopAt + WATER_STOP_MS);
    expect(cellOf(harness)!.animation).toBe("idle");
  });

  it("entrar a la sala con el agua ya corriendo muestra el loop, no el arranque", async () => {
    const harness = tubHarness({
      behavior: { key: "FILLING", via: null, to: null, at: T0 - 600_000 },
    });

    await boot(harness, T0);
    expect(cellOf(harness)!.animation).toBe("water_loop");
  });
});

describe("puerta: CLOSED → opening → OPEN → closing → CLOSED", () => {
  function doorHarness(state?: unknown) {
    return makeHarness({
      behavior: withAtlases(DOOR_BEHAVIOR),
      state,
      atlases: { closed: [1, 1], opening: [6, 1], open: [1, 1], closing: [6, 1] },
    });
  }

  it("recorre el ciclo completo", async () => {
    const harness = doorHarness();
    await boot(harness);
    expect(cellOf(harness)!.animation).toBe("closed");

    harness.animator.applyRemoteState(
      "item-1",
      { state: "OPEN", via: "opening", at: T0 },
      T0,
    );
    await harness.flushLoads();

    harness.animator.update(T0 + 80);
    expect(cellOf(harness)!.animation).toBe("opening");
    harness.animator.update(T0 + DOOR_MS);
    expect(cellOf(harness)!.animation).toBe("open");

    const closeAt = T0 + 5_000;
    harness.animator.applyRemoteState(
      "item-1",
      { state: "CLOSED", via: "closing", at: closeAt },
      closeAt,
    );
    await harness.flushLoads();
    harness.animator.update(closeAt + DOOR_MS);
    expect(cellOf(harness)!.animation).toBe("closed");
  });
});

// ═══════════════════════ estado inicial al entrar ═══════════════════════

describe("jugador que entra a la sala (PARTE 9)", () => {
  function tvHarness(state: unknown) {
    return makeHarness({
      behavior: withAtlases(TV_BEHAVIOR),
      state,
      atlases: { off: [1, 1], turn_on: [5, 1], screen_loop: [4, 1], turn_off: [5, 1] },
    });
  }

  it("sin transición: muestra el estado estable", async () => {
    const harness = tvHarness({ behavior: { key: "OFF", via: null, to: null, at: T0 } });
    await boot(harness, T0 + 50_000);
    expect(cellOf(harness)!.animation).toBe("off");
  });

  it("estado ON guardado: arranca directamente su loop", async () => {
    const harness = tvHarness({ behavior: { key: "ON", via: null, to: null, at: T0 } });
    await boot(harness, T0 + 50_000);
    expect(cellOf(harness)!.animation).toBe("screen_loop");
  });

  it("transición reciente: reanuda desde el frame correcto", async () => {
    const harness = tvHarness({
      behavior: { key: "OFF", via: "turn_on", to: "ON", at: T0 },
    });

    await boot(harness, T0 + 250);
    expect(cellOf(harness)).toEqual({ animation: "turn_on", row: 0, col: 3 });
  });

  it("transición TERMINADA: muestra el final sin esperar otro evento", async () => {
    const harness = tvHarness({
      behavior: { key: "OFF", via: "turn_on", to: "ON", at: T0 },
    });

    await boot(harness, T0 + TURN_MS + 5_000);
    expect(cellOf(harness)!.animation).toBe("screen_loop");
  });

  it("sin bloque de behavior en el state arranca en el estado inicial", async () => {
    const harness = tvHarness(null);
    await boot(harness);
    expect(cellOf(harness)!.animation).toBe("off");
  });
});

// ═══════════════════════════════ direcciones ═══════════════════════════════

describe("direcciones (PARTE 5)", () => {
  function directionalHarness(rotation: number) {
    const behavior = withAtlases({
      ...TV_BEHAVIOR,
      animations: TV_BEHAVIOR.animations.map((animation) => ({
        ...animation,
        directional: true,
      })),
    });
    return makeHarness({
      behavior,
      rotation,
      directions: 4,
      // 4 filas: una por dirección.
      atlases: { off: [1, 4], turn_on: [5, 4], screen_loop: [4, 4], turn_off: [5, 4] },
    });
  }

  it("una animación direccional usa la fila de la rotación actual", async () => {
    for (const rotation of [0, 1, 2, 3]) {
      const harness = directionalHarness(rotation);
      await boot(harness);
      expect(cellOf(harness)!.row).toBe(rotation);
    }
  });

  it("recorta la celda correcta del atlas", async () => {
    const harness = directionalHarness(2);
    await boot(harness);
    harness.animator.applyRemoteState(
      "item-1",
      { state: "ON", via: "turn_on", at: T0 },
      T0,
    );
    await harness.flushLoads();
    harness.animator.update(T0 + 90); // frame 1

    // turn_on: 5 cols x 4 filas de 32x48.
    const frame = harness.textures.frameOf(urlFor("turn_on"), "wo-turn_on-2-1");
    expect(frame).toEqual({ x: 32, y: 96, w: 32, h: 48 });
  });

  it("una animación NO direccional ignora la rotación", async () => {
    // El objeto tiene 4 caras, pero ESTA animación se autorizó como no
    // direccional: una sola fila reutilizada en las 4 rotaciones.
    const harness = makeHarness({
      behavior: withAtlases(nonDirectional(PALM_BEHAVIOR)),
      rotation: 3,
      directions: 4,
      atlases: { idle_loop: [6, 1] },
    });
    await boot(harness);
    expect(cellOf(harness)!.row).toBe(0);
  });

  it("un atlas de UNA fila no se parte en 4 por ser divisible", async () => {
    // 48 px de alto son divisibles entre 4, pero darían celdas de 12 px —
    // por debajo del mínimo que el generador acepta. Se trata como una fila.
    const harness = makeHarness({
      behavior: withAtlases(PALM_BEHAVIOR), // directional: true
      rotation: 3,
      directions: 4,
      atlases: { idle_loop: [6, 1] }, // pero el atlas tiene UNA fila
    });
    await boot(harness);

    expect(cellOf(harness)!.row).toBe(0);
    expect(harness.textures.frameOf(urlFor("idle_loop"), "wo-idle_loop-0-0")).toEqual({
      x: 0,
      y: 0,
      w: 32,
      h: 48,
    });
  });

  it("no asume frames cuadrados ni del mismo tamaño entre objetos", async () => {
    const harness = makeHarness({
      behavior: withAtlases(PALM_BEHAVIOR),
      atlases: {},
    });
    // Atlas de 6 columnas x 1 fila, celdas de 17x93 (nada cuadrado).
    harness.textures.add(urlFor("idle_loop"), 6, 1, 17, 93);

    await boot(harness);
    harness.animator.update(T0 + 1000 / 6);

    expect(harness.textures.frameOf(urlFor("idle_loop"), "wo-idle_loop-0-1")).toEqual({
      x: 17,
      y: 0,
      w: 17,
      h: 93,
    });
  });
});

// ═══════════════════════════════ robustez ═══════════════════════════════

describe("robustez", () => {
  it("behavior corrupto: el objeto no se registra y se dibuja como siempre", () => {
    const harness = makeHarness({ behavior: { version: 1, states: "no-soy-array" } });
    expect(harness.animator.register(harness.object, T0)).toBe(false);
    expect(harness.sprite.calls).toHaveLength(0);
  });

  it("animación inexistente en la transición: asienta en el estado destino", async () => {
    const harness = makeHarness({
      behavior: withAtlases(TV_BEHAVIOR),
      atlases: { off: [1, 1], screen_loop: [4, 1] },
    });
    await boot(harness);

    harness.animator.applyRemoteState(
      "item-1",
      { state: "ON", via: "animacion_que_no_existe", at: T0 },
      T0,
    );
    await harness.flushLoads();
    harness.animator.update(T0);

    expect(cellOf(harness)!.animation).toBe("screen_loop");
  });

  it("estado remoto inexistente cae al inicial", async () => {
    const harness = makeHarness({
      behavior: withAtlases(TV_BEHAVIOR),
      atlases: { off: [1, 1], turn_on: [5, 1], screen_loop: [4, 1], turn_off: [5, 1] },
    });
    await boot(harness);

    harness.animator.applyRemoteState("item-1", { state: "ESTADO_FANTASMA" }, T0);
    await harness.flushLoads();
    harness.animator.update(T0);

    expect(cellOf(harness)!.animation).toBe("off");
  });

  it("sin spriteSheetUrl no se dibuja nada nuevo y no se rompe", async () => {
    const behavior = {
      ...PALM_BEHAVIOR,
      animations: PALM_BEHAVIOR.animations.map((animation) => ({
        ...animation,
        spriteSheetUrl: null,
      })),
    };
    const harness = makeHarness({ behavior });

    await boot(harness);
    harness.animator.update(T0 + 1_000);

    expect(harness.sprite.currentFrame).toBe("base-texture-room-0");
    expect(harness.loadRequests).toHaveLength(0);
  });

  it("textura todavía cargando: se deja el sprite y se reanuda al llegar", async () => {
    const url = urlFor("idle_loop");
    const harness = makeHarness({
      behavior: withAtlases(PALM_BEHAVIOR),
      atlases: { idle_loop: [6, 1] },
      neverLoads: [url],
    });

    harness.animator.register(harness.object, T0);
    harness.animator.update(T0 + 500);

    // Nada roto: sigue el sprite base, y la carga se pidió UNA sola vez.
    expect(harness.sprite.currentFrame).toBe("base-texture-room-0");
    expect(harness.loadRequests.filter((requested) => requested === url)).toHaveLength(1);
  });

  it("si el atlas falla al cargar, el objeto se queda estático sin reventar", async () => {
    const url = urlFor("idle_loop");
    const harness = makeHarness({
      behavior: withAtlases(PALM_BEHAVIOR),
      atlases: { idle_loop: [6, 1] },
      failsToLoad: [url],
    });

    await boot(harness);
    harness.animator.update(T0 + 1_000);

    expect(harness.sprite.currentFrame).toBe("base-texture-room-0");
  });

  it("la textura llega tarde y se dibuja el frame de AHORA, no el primero", async () => {
    const harness = makeHarness({
      behavior: withAtlases(PALM_BEHAVIOR),
      atlases: { idle_loop: [6, 1] },
    });

    harness.animator.register(harness.object, T0);
    // La textura aparece 500 ms después.
    await harness.flushLoads();
    harness.animator.update(T0 + 500);

    // 500 ms a 6 fps => frame 3.
    expect(cellOf(harness)).toEqual({ animation: "idle_loop", row: 0, col: 3 });
  });

  it("objeto destruido mientras reproduce: update() no lo toca más", async () => {
    const harness = makeHarness({
      behavior: withAtlases(PALM_BEHAVIOR),
      atlases: { idle_loop: [6, 1] },
    });
    await boot(harness);

    harness.animator.unregister("item-1");
    const before = harness.sprite.calls.length;
    harness.animator.update(T0 + 10_000);

    expect(harness.sprite.calls.length).toBe(before);
    expect(harness.animator.has("item-1")).toBe(false);
  });

  it("destroy() limpia todo y update() queda inerte", async () => {
    const harness = makeHarness({
      behavior: withAtlases(PALM_BEHAVIOR),
      atlases: { idle_loop: [6, 1] },
    });
    await boot(harness);

    harness.animator.destroy();
    const before = harness.sprite.calls.length;
    harness.animator.update(T0 + 10_000);

    expect(harness.sprite.calls.length).toBe(before);
  });

  it("un atlas cuyo tamaño no casa con framesCount no recorta celdas corridas", async () => {
    const harness = makeHarness({
      behavior: withAtlases(PALM_BEHAVIOR),
      atlases: {},
    });
    // idle_loop declara 6 frames pero el atlas mide 100 px de ancho.
    harness.textures.add(urlFor("idle_loop"), 1, 1, 100, 48);

    await boot(harness);
    harness.animator.update(T0 + 500);

    // Mejor no dibujar que dibujar medio frame de cada celda.
    expect(harness.sprite.currentFrame).toBe("base-texture-room-0");
  });

  it("un atlas roto NO congela la máquina de estados", async () => {
    // Poder dibujar y poder avanzar son dos cosas distintas. Si un atlas
    // malformado sacara al objeto del bucle, `tick()` nunca asentaría la
    // transición y este cliente se quedaría en OFF mientras el servidor y el
    // resto de los jugadores ya están en ON.
    const harness = makeHarness({
      behavior: withAtlases(TV_BEHAVIOR),
      atlases: { off: [1, 1], screen_loop: [4, 1] },
    });
    // turn_on declara 5 frames pero su atlas mide 128 px: no divide.
    harness.textures.add(urlFor("turn_on"), 1, 1, 128, 48);

    await boot(harness);
    harness.animator.applyRemoteState(
      "item-1",
      { state: "ON", via: "turn_on", at: T0 },
      T0,
    );
    await harness.flushLoads();

    // Durante la transición no se dibuja turn_on (mejor eso que celdas
    // corridas), pero al terminar el estado SÍ avanza a ON.
    harness.animator.update(T0 + 100);
    expect(cellOf(harness)?.animation).not.toBe("turn_on");

    harness.animator.update(T0 + TURN_MS);
    expect(cellOf(harness)!.animation).toBe("screen_loop");
  });

  it("una animación sin atlas tampoco congela la transición", async () => {
    const behavior = withAtlases(TV_BEHAVIOR);
    const broken = {
      ...behavior,
      animations: behavior.animations.map((animation: any) =>
        animation.key === "turn_on" ? { ...animation, spriteSheetUrl: null } : animation,
      ),
    };
    const harness = makeHarness({
      behavior: broken,
      atlases: { off: [1, 1], screen_loop: [4, 1] },
    });

    await boot(harness);
    harness.animator.applyRemoteState(
      "item-1",
      { state: "ON", via: "turn_on", at: T0 },
      T0,
    );
    await harness.flushLoads();

    harness.animator.update(T0 + TURN_MS);
    expect(cellOf(harness)!.animation).toBe("screen_loop");
  });

  it("registrar dos veces el mismo objeto no duplica nada", async () => {
    const harness = makeHarness({
      behavior: withAtlases(PALM_BEHAVIOR),
      atlases: { idle_loop: [6, 1] },
    });
    await boot(harness);
    await boot(harness);

    harness.animator.update(T0 + 1000 / 6);
    expect(cellOf(harness)).toEqual({ animation: "idle_loop", row: 0, col: 1 });
  });
});

// ════════════════════════════ rendimiento ════════════════════════════

describe("coste del bucle", () => {
  it("un objeto en estado quieto no se recorre en update()", async () => {
    const harness = makeHarness({
      behavior: withAtlases(TV_BEHAVIOR),
      atlases: { off: [1, 1] },
    });
    await boot(harness);

    const before = harness.sprite.calls.length;
    for (let tick = 0; tick < 100; tick++) {
      harness.animator.update(T0 + tick * 16);
    }

    // 100 ticks sin una sola escritura en el sprite.
    expect(harness.sprite.calls.length).toBe(before);
  });

  it("un loop sólo escribe cuando el frame cambia de verdad", async () => {
    const harness = makeHarness({
      behavior: withAtlases(PALM_BEHAVIOR),
      atlases: { idle_loop: [6, 1] },
    });
    await boot(harness);

    const before = harness.sprite.calls.length;
    // 10 ticks a 60 fps dentro del mismo frame de animación (166 ms).
    for (let tick = 1; tick <= 9; tick++) {
      harness.animator.update(T0 + tick * 16);
    }

    expect(harness.sprite.calls.length).toBe(before);
  });
});
