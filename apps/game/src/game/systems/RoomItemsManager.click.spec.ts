// RoomItemsManager importa Phaser (y phaserAssetCache, que también), y Phaser
// toca `window` al cargarse. Mismo mock que RoomItemsManager.hitArea.spec.ts.
jest.mock("phaser", () => ({ __esModule: true, default: {} }));

import { TV_BEHAVIOR, PALM_BEHAVIOR } from "@codebuddies/world-objects";

import RoomItemsManager from "./RoomItemsManager";
import type IsoGrid from "../iso/IsoGrid";

/**
 * CLICK FÍSICO sobre un world object.
 *
 * Lo que se fija acá es el ENRUTADO del `pointerdown`: cuándo pide una
 * interacción al servidor y cuándo cae al comportamiento de siempre
 * (seleccionar + menú). Ni una sola decisión de estado vive en el cliente: lo
 * único que sale es "quiero interactuar con este objeto".
 *
 * El área de clic real (pixel-perfect sobre el frame) la cubre
 * RoomItemsManager.hitArea.spec.ts, que no se toca.
 */

// ── geometría mínima, igual que en hitArea.spec ──
const TW = 64;
const TH = 32;
const GROUND_OFFSET_Y = 64;

const groundAnchor = (tx: number, ty: number) => ({
  x: ((tx - ty) * TW) / 2 + TW / 2,
  y: ((tx + ty) * TH) / 2 + GROUND_OFFSET_Y,
});

const grid = {
  elevationStep: TH / 2,
  groundAnchor,
  groundDiamond: () => [],
  worldToGroundTile: () => null,
  footprintAnchor: (tiles: { x: number; y: number }[]) => ({
    ...groundAnchor(tiles[0].x, tiles[0].y),
    frontTile: tiles[0],
  }),
} as unknown as IsoGrid;

type Handlers = Record<string, (...args: any[]) => void>;

function makeScene(options: { buildMode?: boolean; itemInHand?: boolean } = {}) {
  const texture = {
    key: "tv",
    has: () => true,
    add: () => undefined,
    width: 128,
    height: 128,
  };

  const sprites: any[] = [];

  const makeSprite = () => {
    const handlers: Handlers = {};
    const sprite: any = {
      x: 0,
      y: 0,
      depth: 0,
      displayWidth: 64,
      displayHeight: 64,
      texture,
      frame: { name: "tv-room-0" },
      handlers,
      setOrigin: () => sprite,
      setPosition: () => sprite,
      setFrame: () => sprite,
      setTexture: () => sprite,
      setDepth: () => sprite,
      setTint: () => sprite,
      clearTint: () => sprite,
      setInteractive: () => sprite,
      destroy: () => undefined,
      on: (event: string, handler: (...args: any[]) => void) => {
        // Se registra por evento: si alguien añadiera un segundo listener de
        // pointerdown, el test de "un click = un evento" lo detectaría.
        handlers[event] = handlers[event]
          ? ((...args: any[]) => {
              (handlers as any)[`${event}__first`]?.(...args);
              handler(...args);
            })
          : handler;
        return sprite;
      },
    };
    sprites.push(sprite);
    return sprite;
  };

  const scene = {
    textures: { exists: () => true, get: () => texture },
    add: {
      sprite: makeSprite,
      pointlight: () => ({
        setDepth: () => undefined,
        destroy: () => undefined,
        setPosition: () => undefined,
      }),
    },
    buildSystem: { getCurrentItem: () => (options.itemInHand ? { id: "x" } : null) },
    isBuildModeActive: () => Boolean(options.buildMode),
    // Lo que necesita pointerToScreenPosition() en la rama de selección, para
    // colocar el menú contextual junto al puntero.
    sys: { game: { canvas: { getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, top: 0 }) } } },
    scale: { width: 800, height: 600 },
    cameras: { main: { scrollX: 0, scrollY: 0, zoom: 1 } },
  };

  return { scene, sprites };
}

/** Objeto de sala con (o sin) behavior. */
function payload(options: {
  behavior?: unknown;
  interactionTypes?: string[];
  isInteractable?: boolean;
  state?: unknown;
}) {
  return {
    id: "item-1",
    x: 5,
    y: 5,
    rotation: 0,
    roomId: "room-1",
    userId: "owner",
    state: options.state ?? null,
    item: {
      id: "tv",
      imageUrl: "https://cdn/tv.png",
      worldData: {
        kind: "FURNITURE",
        directions: 1,
        width: 128,
        height: 128,
        isInteractable: options.isInteractable ?? true,
        interactionTypes: options.interactionTypes ?? ["CLICK"],
        behavior: options.behavior ?? null,
        footprints: null,
      },
    },
  };
}

/** Pointer de Phaser reducido a lo que mira el enrutado. */
const leftPointer = { leftButtonDown: () => true, worldX: 0, worldY: 0, x: 0, y: 0 };
const rightPointer = { leftButtonDown: () => false, worldX: 0, worldY: 0, x: 0, y: 0 };

describe("click físico sobre un world object", () => {
  let emitted: Array<{ event: string; payload: any }>;
  let selectedEvents: any[];

  beforeEach(() => {
    emitted = [];
    selectedEvents = [];

    (globalThis as any).window = globalThis;
    (globalThis as any).phaserSocket = {
      emit: (event: string, data: unknown) => emitted.push({ event, payload: data }),
    };
    (globalThis as any).dispatchEvent = (event: any) => {
      if (event?.type === "room:item:selected") selectedEvents.push(event.detail);
      return true;
    };
    (globalThis as any).CustomEvent = class {
      type: string;
      detail: any;
      constructor(type: string, init?: { detail?: any }) {
        this.type = type;
        this.detail = init?.detail;
      }
    };
  });

  afterEach(() => {
    delete (globalThis as any).phaserSocket;
  });

  /** Coloca el item y dispara un pointerdown sobre su sprite. */
  function click(
    options: Parameters<typeof payload>[0] & { buildMode?: boolean; itemInHand?: boolean },
    pointer: any = leftPointer,
  ) {
    const { scene, sprites } = makeScene({
      buildMode: options.buildMode,
      itemInHand: options.itemInHand,
    });
    const manager = new RoomItemsManager(scene as any, grid);
    manager.addItem(payload(options) as any, "tv");

    const sprite = sprites[0];
    const stopPropagation = jest.fn();
    sprite.handlers.pointerdown?.(pointer, 0, 0, { stopPropagation });

    return { manager, sprite, stopPropagation };
  }

  // ─────────────────────────── objeto interactivo ───────────────────────────

  describe("objeto con behavior y CLICK", () => {
    it("un click izquierdo pide la interacción al servidor", () => {
      click({ behavior: TV_BEHAVIOR });

      expect(emitted).toEqual([
        {
          event: "room:item:interact",
          payload: { roomItemId: "item-1", interaction: "CLICK" },
        },
      ]);
    });

    it("el payload NO lleva estado, animación ni behavior", () => {
      // Si el cliente pudiera mandar `to` o `state`, un cliente modificado
      // pondría cualquier objeto en cualquier estado.
      click({ behavior: TV_BEHAVIOR });

      expect(Object.keys(emitted[0].payload).sort()).toEqual([
        "interaction",
        "roomItemId",
      ]);
    });

    it("UN click físico produce UN solo room:item:interact", () => {
      click({ behavior: TV_BEHAVIOR });
      expect(emitted).toHaveLength(1);
    });

    it("no hace actualización optimista: no toca el sprite ni selecciona", () => {
      const { sprite } = click({ behavior: TV_BEHAVIOR });

      // Nada de tint de selección, ni menú, ni cambio de frame.
      expect(selectedEvents).toHaveLength(0);
      expect(sprite.frame.name).toBe("tv-room-0");
    });

    it("corta la propagación para que el personaje no camine hacia el mueble", () => {
      const { stopPropagation } = click({ behavior: TV_BEHAVIOR });
      expect(stopPropagation).toHaveBeenCalledTimes(1);
    });

    it("un segundo click vuelve a pedir al servidor, que es quien decide", () => {
      // El cliente NO intenta adivinar si hay una transición en curso: eso lo
      // resuelve el servidor con isTransitionInFlight() y responde
      // changed:false. Acá sólo se comprueba que no se bloquea a sí mismo.
      const { sprite } = click({ behavior: TV_BEHAVIOR });
      sprite.handlers.pointerdown?.(leftPointer, 0, 0, { stopPropagation: jest.fn() });

      expect(emitted).toHaveLength(2);
      expect(emitted.every((entry) => entry.payload.interaction === "CLICK")).toBe(true);
    });
  });

  // ─────────────────────────── cuándo NO interactúa ───────────────────────────

  describe("cuándo cae al comportamiento de siempre", () => {
    it("modo construcción: selecciona en vez de interactuar", () => {
      click({ behavior: TV_BEHAVIOR, buildMode: true });

      expect(emitted).toHaveLength(0);
      expect(selectedEvents).toHaveLength(1);
    });

    it("con un mueble en la mano deja pasar el evento al sistema de colocación", () => {
      const { stopPropagation } = click({ behavior: TV_BEHAVIOR, itemInHand: true });

      expect(emitted).toHaveLength(0);
      expect(selectedEvents).toHaveLength(0);
      // Ni siquiera corta la propagación: el click es para colocar.
      expect(stopPropagation).not.toHaveBeenCalled();
    });

    it("click DERECHO no interactúa: abre el menú de siempre", () => {
      click({ behavior: TV_BEHAVIOR }, rightPointer);

      expect(emitted).toHaveLength(0);
      expect(selectedEvents).toHaveLength(1);
    });

    it("objeto SIN behavior: comportamiento legacy intacto", () => {
      click({ behavior: null, interactionTypes: ["TOGGLE"] });

      expect(emitted).toHaveLength(0);
      expect(selectedEvents).toHaveLength(1);
    });

    it("objeto no interactivo: no manda nada", () => {
      click({ behavior: TV_BEHAVIOR, isInteractable: false });

      expect(emitted).toHaveLength(0);
      expect(selectedEvents).toHaveLength(1);
    });

    it("objeto con behavior pero sin CLICK en interactionTypes", () => {
      // El servidor lo rechazaría con un error visible; mejor no pedirlo.
      click({ behavior: TV_BEHAVIOR, interactionTypes: ["TOGGLE"] });

      expect(emitted).toHaveLength(0);
      expect(selectedEvents).toHaveLength(1);
    });

    it("objeto cuyo behavior no declara ninguna transición de CLICK", () => {
      // La palmera está animada pero no reacciona al click: tiene que seguir
      // abriendo el menú, no quedarse sin respuesta.
      click({ behavior: PALM_BEHAVIOR });

      expect(emitted).toHaveLength(0);
      expect(selectedEvents).toHaveLength(1);
    });

    it("behavior corrupto: cae a legacy sin romper", () => {
      click({ behavior: { version: 1, states: "no-soy-array" } });

      expect(emitted).toHaveLength(0);
      expect(selectedEvents).toHaveLength(1);
    });
  });

  // ─────────────────────────── hit area y listeners ───────────────────────────

  describe("hit area y listeners", () => {
    it("sigue usando el hit test pixel-perfect sobre el frame actual", () => {
      // La corrección anterior (área de clic = alpha real del frame) no se
      // toca: el objeto animado cambia de frame y Phaser relee gameObject.frame
      // en cada test, así que el área acompaña a la animación.
      const config = jest.requireActual("./RoomItemsManager").ITEM_INTERACTIVE_CONFIG;
      expect(config).toEqual({
        pixelPerfect: true,
        alphaTolerance: 1,
        useHandCursor: true,
      });
    });

    it("se registra UN solo listener de pointerdown", () => {
      const { scene, sprites } = makeScene();
      const manager = new RoomItemsManager(scene as any, grid);
      manager.addItem(payload({ behavior: TV_BEHAVIOR }) as any, "tv");

      const registered = Object.keys(sprites[0].handlers).filter(
        (event) => event === "pointerdown",
      );
      expect(registered).toHaveLength(1);
    });

    it("no hay listener de pointerup que pueda duplicar la interacción", () => {
      const { scene, sprites } = makeScene();
      const manager = new RoomItemsManager(scene as any, grid);
      manager.addItem(payload({ behavior: TV_BEHAVIOR }) as any, "tv");

      expect(sprites[0].handlers.pointerup).toBeUndefined();
    });
  });

  // ─────────────────────────── seguridad ───────────────────────────

  describe("seguridad", () => {
    it("sin socket no revienta", () => {
      delete (globalThis as any).phaserSocket;
      expect(() => click({ behavior: TV_BEHAVIOR })).not.toThrow();
    });
  });
});
