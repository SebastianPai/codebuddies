import {
  readBehavior,
  resolveAtlasGeometry,
  TV_BEHAVIOR,
  validateBehavior,
  type WorldBehavior,
} from "@codebuddies/world-objects";

import {
  addAnimation,
  addState,
  addTransition,
  createStarterDraft,
  draftFromBehavior,
  draftToBehavior,
  draftToPayload,
  removeAnimation,
  updateAnimation,
  updateState,
  updateTransition,
  validateDraft,
  type BehaviorDraft,
} from "./behavior-draft";
import {
  createPreviewState,
  describePreview,
  triggerPreview,
} from "./behavior-preview-state";

/**
 * Del ATLAS SUBIDO al behavior guardado.
 *
 * Cubre la costura entre `FrameSetUpload` y el editor: lo que devuelve
 * `POST /uploads/frames` tiene que poder pegarse tal cual en una animación y
 * producir un `WorldBehavior` válido, con la preview mostrando el sprite.
 *
 * La forma de la metadata NO se inventa acá: es la que fija
 * `uploads.frames.controller.spec.ts` contra el endpoint real.
 */

/** Respuesta de `POST /uploads/frames`, con la forma real del endpoint. */
type FrameAtlasMetadata = {
  url: string;
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
  framesCount: number;
  directions: number;
  directional: boolean;
  bytes: number;
  animation: {
    row: number;
    startCol: number;
    framesCount: number;
    directional: boolean;
    spriteSheetUrl: string;
  };
};

function uploadResult(options: {
  key: string;
  framesCount: number;
  directions?: number;
  frameWidth?: number;
  frameHeight?: number;
}): FrameAtlasMetadata {
  const directions = options.directions ?? 1;
  const frameWidth = options.frameWidth ?? 32;
  const frameHeight = options.frameHeight ?? 48;
  const url = `https://cdn.test/objects/tv/animations/${options.key}/1700000000-abc.png`;

  return {
    url,
    frameWidth,
    frameHeight,
    cols: options.framesCount,
    rows: directions,
    framesCount: options.framesCount,
    directions,
    directional: directions > 1,
    bytes: 1024,
    animation: {
      row: 0,
      startCol: 0,
      framesCount: options.framesCount,
      directional: directions > 1,
      spriteSheetUrl: url,
    },
  };
}

/** Lo que hace `onUploaded` en BehaviorEditor, literalmente. */
function applyUpload(
  draft: BehaviorDraft,
  animationId: string,
  metadata: FrameAtlasMetadata,
): BehaviorDraft {
  return updateAnimation(draft, animationId, {
    spriteSheetUrl: metadata.url,
    framesCount: metadata.framesCount,
    directional: metadata.directional,
    row: 0,
    startCol: 0,
  });
}

/** Medidas del PNG, como las leería el navegador con `new Image()`. */
function atlasSize(metadata: FrameAtlasMetadata) {
  return {
    width: metadata.cols * metadata.frameWidth,
    height: metadata.rows * metadata.frameHeight,
  };
}

describe("atlas subido -> animación del editor", () => {
  it("la metadata del upload se pega tal cual en la animación", () => {
    let draft = addAnimation(createStarterDraft());
    const metadata = uploadResult({ key: "turn_on", framesCount: 5 });

    draft = applyUpload(draft, draft.animations[0].id, metadata);

    expect(draft.animations[0]).toMatchObject({
      spriteSheetUrl: metadata.url,
      framesCount: 5,
      directional: false,
      row: 0,
      startCol: 0,
    });
  });

  it("el fragmento `animation` del endpoint coincide con lo que guarda el editor", () => {
    // Si divergieran, el editor estaría reinterpretando la respuesta en vez de
    // usarla.
    let draft = addAnimation(createStarterDraft());
    const metadata = uploadResult({ key: "turn_on", framesCount: 5 });
    draft = applyUpload(draft, draft.animations[0].id, metadata);

    const saved = draft.animations[0];
    expect({
      row: saved.row,
      startCol: saved.startCol,
      framesCount: saved.framesCount,
      directional: saved.directional,
      spriteSheetUrl: saved.spriteSheetUrl,
    }).toEqual(metadata.animation);
  });

  it("una animación direccional llega marcada como tal", () => {
    let draft = addAnimation(createStarterDraft());
    const metadata = uploadResult({ key: "spin", framesCount: 3, directions: 4 });

    draft = applyUpload(draft, draft.animations[0].id, metadata);

    expect(draft.animations[0].directional).toBe(true);
    expect(draft.animations[0].framesCount).toBe(3);
  });

  it("el upload NO pisa fps ni loop, que elige el creador", () => {
    let draft = addAnimation(createStarterDraft());
    draft = updateAnimation(draft, draft.animations[0].id, { fps: 24, loop: true });

    draft = applyUpload(
      draft,
      draft.animations[0].id,
      uploadResult({ key: "x", framesCount: 4 }),
    );

    expect(draft.animations[0].fps).toBe(24);
    expect(draft.animations[0].loop).toBe(true);
  });

  it("reemplazar el atlas cambia la url y la cantidad de frames", () => {
    let draft = addAnimation(createStarterDraft());
    const id = draft.animations[0].id;

    draft = applyUpload(draft, id, uploadResult({ key: "turn_on", framesCount: 5 }));
    const firstUrl = draft.animations[0].spriteSheetUrl;

    const replacement = {
      ...uploadResult({ key: "turn_on", framesCount: 8 }),
      url: "https://cdn.test/objects/tv/animations/turn_on/1700000999-zzz.png",
    };
    replacement.animation.spriteSheetUrl = replacement.url;
    draft = applyUpload(draft, id, replacement);

    expect(draft.animations[0].spriteSheetUrl).not.toBe(firstUrl);
    expect(draft.animations[0].framesCount).toBe(8);
  });

  it("borrar la animación se lleva su atlas del behavior", () => {
    let draft = addAnimation(createStarterDraft());
    draft = applyUpload(
      draft,
      draft.animations[0].id,
      uploadResult({ key: "x", framesCount: 3 }),
    );

    draft = removeAnimation(draft, draft.animations[0].id);

    expect(draft.animations).toHaveLength(0);
    expect(JSON.stringify(draftToBehavior(draft))).not.toContain("cdn.test");
  });
});

describe("TV completa con atlas subidos", () => {
  /** Monta la TV exactamente como la montaría el creador en la UI. */
  function buildTv(): { draft: BehaviorDraft; atlases: Record<string, FrameAtlasMetadata> } {
    const atlases: Record<string, FrameAtlasMetadata> = {
      off: uploadResult({ key: "off", framesCount: 1 }),
      turn_on: uploadResult({ key: "turn_on", framesCount: 5 }),
      screen_loop: uploadResult({ key: "screen_loop", framesCount: 4 }),
      turn_off: uploadResult({ key: "turn_off", framesCount: 5 }),
    };

    let draft = createStarterDraft();
    draft = updateState(draft, draft.states[0].id, { key: "OFF" });
    draft = addState(draft);
    draft = updateState(draft, draft.states[1].id, { key: "ON" });

    const specs: Array<[string, number, boolean]> = [
      ["off", 1, false],
      ["turn_on", 12, false],
      ["screen_loop", 8, true],
      ["turn_off", 12, false],
    ];

    specs.forEach(([key, fps, loop], index) => {
      draft = addAnimation(draft);
      draft = updateAnimation(draft, draft.animations[index].id, { key, fps, loop });
      draft = applyUpload(draft, draft.animations[index].id, atlases[key]);
    });

    draft = updateState(draft, draft.states.find((s) => s.key === "OFF")!.id, {
      animation: "off",
    });
    draft = updateState(draft, draft.states.find((s) => s.key === "ON")!.id, {
      animation: "screen_loop",
    });

    draft = addTransition(draft);
    draft = updateTransition(draft, draft.transitions[0].id, {
      fromState: "OFF",
      action: "PLAY_ANIMATION",
      animation: "turn_on",
      onComplete: "SET_STATE",
      targetState: "ON",
    });

    return { draft, atlases };
  }

  it("el behavior resultante es válido", () => {
    const { draft } = buildTv();
    const result = validateDraft(draft);

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("cada animación conserva SU propio atlas", () => {
    const { draft, atlases } = buildTv();
    const behavior = draftToBehavior(draft);

    expect(behavior.animations.map((a) => a.spriteSheetUrl)).toEqual([
      atlases.off.url,
      atlases.turn_on.url,
      atlases.screen_loop.url,
      atlases.turn_off.url,
    ]);
  });

  it("el payload que viaja al backend lleva las urls", () => {
    const { draft, atlases } = buildTv();
    const payload = draftToPayload(draft, false) as WorldBehavior;

    expect(JSON.stringify(payload)).toContain(atlases.turn_on.url);
    expect(validateBehavior(payload).ok).toBe(true);
  });

  it("hace ida y vuelta por el contrato sin perder los atlas", () => {
    // Guardar -> leer -> reabrir el editor.
    const { draft, atlases } = buildTv();
    const saved = draftToBehavior(draft);
    const reopened = draftFromBehavior(saved);

    expect(draftToBehavior(reopened)).toEqual(saved);
    expect(
      reopened.animations.find((a) => a.key === "turn_on")!.spriteSheetUrl,
    ).toBe(atlases.turn_on.url);
  });

  it("lo que lee el juego es lo mismo que guardó el editor", () => {
    const { draft } = buildTv();
    const fromGame = readBehavior(draftToBehavior(draft));

    expect(fromGame).toEqual(draftToBehavior(draft));
  });
});

describe("preview con el atlas subido", () => {
  it("muestra la celda del atlas en cuanto hay medidas", () => {
    const metadata = uploadResult({ key: "idle", framesCount: 4 });
    const behavior: WorldBehavior = {
      version: 1,
      initialState: "IDLE",
      states: [{ key: "IDLE", animation: "idle" }],
      animations: [
        {
          key: "idle",
          row: 0,
          startCol: 0,
          framesCount: metadata.framesCount,
          fps: 8,
          loop: true,
          directional: metadata.directional,
          spriteSheetUrl: metadata.url,
        },
      ],
      transitions: [],
    };

    const view = describePreview(
      behavior,
      createPreviewState(behavior),
      atlasSize(metadata),
      1,
    );

    expect(view.spriteSheetUrl).toBe(metadata.url);
    expect(view.cell).toEqual({ row: 0, col: 0 });
    expect(view.geometry).toEqual({
      frameWidth: metadata.frameWidth,
      frameHeight: metadata.frameHeight,
      rows: 1,
      cols: metadata.framesCount,
    });
  });

  it("la geometría derivada coincide con la que reportó el endpoint", () => {
    // El endpoint dice `frameWidth`/`frameHeight`; el cliente los DERIVA del
    // PNG. Si no coincidieran, el recorte estaría corrido.
    for (const options of [
      { key: "a", framesCount: 5, frameWidth: 32, frameHeight: 48 },
      { key: "b", framesCount: 1, frameWidth: 17, frameHeight: 93 },
      { key: "c", framesCount: 3, directions: 4, frameWidth: 64, frameHeight: 64 },
    ]) {
      const metadata = uploadResult(options);
      const animation = {
        key: metadata.animation.spriteSheetUrl,
        row: 0,
        startCol: 0,
        framesCount: metadata.framesCount,
        fps: 12,
        loop: false,
        directional: metadata.directional,
        spriteSheetUrl: metadata.url,
      };

      const geometry = resolveAtlasGeometry(
        animation,
        atlasSize(metadata),
        metadata.directions,
      );

      expect(geometry).toEqual({
        frameWidth: metadata.frameWidth,
        frameHeight: metadata.frameHeight,
        rows: metadata.rows,
        cols: metadata.cols,
      });
    }
  });

  it("el click avanza sobre el atlas subido", () => {
    const behavior = {
      ...TV_BEHAVIOR,
      animations: TV_BEHAVIOR.animations.map((animation) => ({
        ...animation,
        row: 0,
        startCol: 0,
        directional: false,
        spriteSheetUrl: uploadResult({
          key: animation.key,
          framesCount: animation.framesCount,
        }).url,
      })),
    };

    const state = triggerPreview(behavior, createPreviewState(behavior));
    const view = describePreview(behavior, state, { width: 5 * 32, height: 48 }, 1);

    expect(view.animationKey).toBe("turn_on");
    expect(view.spriteSheetUrl).toContain("/animations/turn_on/");
    expect(view.cell).toEqual({ row: 0, col: 0 });
  });
});
