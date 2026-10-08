import {
  BATHTUB_BEHAVIOR,
  DOOR_BEHAVIOR,
  PALM_BEHAVIOR,
  resolveAtlasGeometry,
  TV_BEHAVIOR,
  type WorldBehavior,
} from "@codebuddies/world-objects";

import WorldObjectAnimator, {
  type AnimatorTextures,
} from "../../../game/src/game/systems/WorldObjectAnimator";
import {
  advancePreview,
  createPreviewState,
  describePreview,
  setPreviewDirection,
  triggerPreview,
  type PreviewState,
} from "./behavior-preview-state";

/**
 * PARIDAD EDITOR ↔ JUEGO.
 *
 * Corre las DOS implementaciones en paralelo con el mismo `WorldBehavior`, los
 * mismos atlas y el mismo reloj, y comprueba que producen exactamente la misma
 * celda del atlas en cada instante:
 *
 *   apps/web  → describePreview()        (CSS background-position)
 *   apps/game → WorldObjectAnimator      (frames de Phaser)
 *
 * El render es distinto a propósito; la LÓGICA no puede serlo. Es el mismo
 * patrón con el que `footprintRotation.ts` y `engine-data.util.ts` se
 * mantienen sincronizados: duplicación consciente más un test que importa las
 * dos y las compara.
 *
 * El animator es importable en Node porque sólo usa `import type Phaser` (se
 * borra al compilar) y recibe el cargador de texturas por constructor.
 */

const CELL = { w: 32, h: 48 };

/** Le da a cada animación su propio atlas, como produce el generador. */
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

function atlasSizeOf(behavior: WorldBehavior, animationKey: string | null, rows: number) {
  const animation = behavior.animations.find((item) => item.key === animationKey);
  if (!animation) return null;
  return { width: animation.framesCount * CELL.w, height: rows * CELL.h };
}

// ── doble de texturas para el animator, con los mismos tamaños ──
function makeAnimatorHarness(behavior: WorldBehavior, rows: number, directions: number) {
  const store = new Map<string, { width: number; height: number; frames: Set<string> }>();
  for (const animation of behavior.animations) {
    if (!animation.spriteSheetUrl) continue;
    store.set(animation.spriteSheetUrl, {
      width: animation.framesCount * CELL.w,
      height: rows * CELL.h,
      frames: new Set(),
    });
  }

  const textures: AnimatorTextures = {
    exists: (key) => store.has(key),
    get: (key) => {
      const texture = store.get(key);
      return {
        has: (name: string) => !!texture?.frames.has(name),
        add: (name) => texture?.frames.add(name),
        get width() {
          return texture?.width;
        },
        get height() {
          return texture?.height;
        },
      };
    },
  };

  const sprite = {
    texture: { key: "base" },
    frame: { name: "base-0" },
    setTexture(key: string, frame?: string) {
      sprite.texture = { key };
      if (frame) sprite.frame = { name: frame };
      return sprite;
    },
    setFrame(frame: string) {
      sprite.frame = { name: frame };
      return sprite;
    },
  };

  const animator = new WorldObjectAnimator(textures, async (url) => url);

  return {
    animator,
    sprite,
    object: {
      roomItemId: "item-1",
      // La rotación del juego se mapea a fila igual que la dirección de la
      // preview (getSpriteFrameIndex envuelve 0-3 al número de caras).
      rotation: 0,
      state: null,
      item: { worldData: { behavior, directions } },
      sprite,
    },
  };
}

/** Celda que está mostrando el animator, leída de su nombre de frame. */
function animatorCell(sprite: { frame: { name: string } }) {
  const match = /^wo-(.+)-(\d+)-(\d+)$/.exec(sprite.frame.name);
  if (!match) return null;
  return { animation: match[1], row: Number(match[2]), col: Number(match[3]) };
}

/** Celda que está mostrando la preview. */
function previewCell(behavior: WorldBehavior, state: PreviewState, rows: number, directions: number) {
  const logical = describePreview(behavior, state, null, directions);
  const view = describePreview(
    behavior,
    state,
    atlasSizeOf(behavior, logical.animationKey, rows),
    directions,
  );
  if (!view.cell || !view.animationKey) return null;
  return { animation: view.animationKey, row: view.cell.row, col: view.cell.col };
}

/**
 * Avanza las dos simulaciones al mismo instante y devuelve lo que muestra cada
 * una. El animator usa el reloj absoluto; la preview su reloj propio, que
 * arranca en 0. Se mantienen alineados porque el animator se registra en t=0.
 */
function compareAt(
  behavior: WorldBehavior,
  harness: ReturnType<typeof makeAnimatorHarness>,
  state: PreviewState,
  rows: number,
  directions: number,
) {
  harness.animator.update(state.clock);
  return {
    game: animatorCell(harness.sprite),
    editor: previewCell(behavior, state, rows, directions),
  };
}

describe.each([
  ["TV", TV_BEHAVIOR],
  ["bañera", BATHTUB_BEHAVIOR],
  ["puerta", DOOR_BEHAVIOR],
  ["palmera", PALM_BEHAVIOR],
])("paridad — %s", (_label, base) => {
  const behavior = withAtlases(base);

  it("muestran la misma celda a lo largo de todo el ciclo", async () => {
    const harness = makeAnimatorHarness(behavior, 1, 1);
    harness.animator.register(harness.object, 0);
    await Promise.resolve();
    await Promise.resolve();

    let state = createPreviewState(behavior);

    // Estado inicial.
    let pair = compareAt(behavior, harness, state, 1, 1);
    expect(pair.editor).toEqual(pair.game);

    // Un click en ambos lados, en el mismo instante.
    state = triggerPreview(behavior, state);
    harness.animator.applyRemoteState(
      "item-1",
      remoteUpdateFor(behavior, state),
      state.clock,
    );
    await Promise.resolve();
    await Promise.resolve();

    // Y se recorre el tiempo comparando en cada paso.
    for (let step = 0; step < 120; step++) {
      state = advancePreview(behavior, state, 16);
      pair = compareAt(behavior, harness, state, 1, 1);
      expect(pair.editor).toEqual(pair.game);
    }
  });
});

/**
 * El update remoto equivalente al click que acaba de aceptar la preview.
 *
 * En el juego esto lo manda el servidor; acá se deriva del runtime para poder
 * poner a las dos implementaciones en el mismo punto de partida.
 */
function remoteUpdateFor(behavior: WorldBehavior, state: PreviewState) {
  const playing = state.runtime.playing;
  if (!playing) return { state: state.runtime.stateKey, via: null, at: state.clock };

  return {
    state:
      playing.onComplete.action === "SET_STATE"
        ? playing.onComplete.state
        : state.runtime.stateKey,
    via: playing.animationKey,
    at: playing.startedAt,
  };
}

describe("paridad — animación direccional", () => {
  const behavior = withAtlases(TV_BEHAVIOR, true);

  it("la dirección de la preview elige la misma fila que la rotación del juego", async () => {
    for (const direction of [0, 1, 2, 3]) {
      const harness = makeAnimatorHarness(behavior, 4, 4);
      harness.object.rotation = direction;
      harness.animator.register(harness.object, 0);
      await Promise.resolve();
      await Promise.resolve();

      const state = setPreviewDirection(createPreviewState(behavior), direction);
      const pair = compareAt(behavior, harness, state, 4, 4);

      expect(pair.editor).toEqual(pair.game);
      expect(pair.editor!.row).toBe(direction);
    }
  });
});

describe("paridad — geometría del atlas", () => {
  it("las dos rechazan un atlas que no casa con su metadata", async () => {
    const behavior = withAtlases(PALM_BEHAVIOR);
    const harness = makeAnimatorHarness(behavior, 1, 1);
    // Se rompe el atlas del animator: 6 frames en un PNG de 100 px.
    const broken: AnimatorTextures = {
      exists: () => true,
      get: () => ({
        has: () => false,
        add: () => undefined,
        width: 100,
        height: 48,
      }),
    };
    const brokenAnimator = new WorldObjectAnimator(broken, async (url) => url);
    const sprite = {
      texture: { key: "base" },
      frame: { name: "base-0" },
      setTexture() {
        return sprite;
      },
      setFrame() {
        return sprite;
      },
    };
    brokenAnimator.register({ ...harness.object, sprite }, 0);
    await Promise.resolve();
    await Promise.resolve();
    brokenAnimator.update(0);

    const state = createPreviewState(behavior);
    const view = describePreview(behavior, state, { width: 100, height: 48 }, 1);

    // Ninguna de las dos dibuja…
    expect(animatorCell(sprite)).toBeNull();
    expect(view.cell).toBeNull();
    // …pero las dos siguen teniendo el estado lógico correcto.
    expect(view.stateKey).toBe("IDLE");
  });
});
/**
 * PARTE 10 — la geometria del atlas tiene UNA sola implementacion.
 *
 * Hasta la Fase 7, `WorldObjectAnimator` tenia una copia privada de la
 * derivacion y el paquete otra. Ahora el animator importa
 * `resolveAtlasGeometry()`, asi que estos casos comprueban que el recorte del
 * juego sale exactamente de esa funcion — incluidos los bordes que antes eran
 * el motivo de tener el test cruzado.
 */
describe("geometria del atlas: una sola fuente", () => {
  const behavior = withAtlases(PALM_BEHAVIOR);
  const animation = behavior.animations[0];

  /** Celda que dibuja el animator con un atlas de estas medidas. */
  async function animatorCellFor(width: number, height: number, directions: number) {
    const textures: AnimatorTextures = {
      exists: () => true,
      get: () => ({ has: () => false, add: () => undefined, width, height }),
    };
    const sprite = {
      texture: { key: "base" },
      frame: { name: "base-0" },
      setTexture(key: string, frame?: string) {
        sprite.texture = { key };
        if (frame) sprite.frame = { name: frame };
        return sprite;
      },
      setFrame(frame: string) {
        sprite.frame = { name: frame };
        return sprite;
      },
    };

    const animator = new WorldObjectAnimator(textures, async (url) => url);
    animator.register(
      {
        roomItemId: "item-1",
        rotation: 0,
        state: null,
        item: { worldData: { behavior, directions } },
        sprite,
      },
      0,
    );
    await Promise.resolve();
    await Promise.resolve();
    animator.update(0);
    return animatorCell(sprite);
  }

  it("el animator usa resolveAtlasGeometry del paquete", async () => {
    const width = animation.framesCount * 32;
    const geometry = resolveAtlasGeometry(animation, { width, height: 48 }, 1);

    expect(geometry).toEqual({ frameWidth: 32, frameHeight: 48, rows: 1, cols: 6 });
    expect(await animatorCellFor(width, 48, 1)).toEqual({
      animation: "idle_loop",
      row: 0,
      col: 0,
    });
  });

  it("un atlas que no divide: ninguna de las dos dibuja", async () => {
    expect(resolveAtlasGeometry(animation, { width: 100, height: 48 }, 1)).toBeNull();
    expect(await animatorCellFor(100, 48, 1)).toBeNull();
  });

  it("filas divisibles pero por debajo del minimo: ambas caen a una fila", async () => {
    // 48 / 4 = 12 px, por debajo de minFrameSize. Es el caso que motivo el
    // guarda-rail, y ahora vive en un solo sitio.
    const directional = { ...animation, directional: true };
    const width = animation.framesCount * 32;

    expect(resolveAtlasGeometry(directional, { width, height: 48 }, 4)?.rows).toBe(1);
  });

  it("medidas invalidas devuelven null en vez de lanzar", () => {
    for (const atlas of [
      null,
      undefined,
      { width: 0, height: 48 },
      { width: Number.NaN, height: 48 },
      { width: -10, height: 48 },
    ]) {
      expect(resolveAtlasGeometry(animation, atlas, 1)).toBeNull();
    }
  });
});
