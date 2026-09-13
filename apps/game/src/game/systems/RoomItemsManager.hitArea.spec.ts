// RoomItemsManager importa Phaser, que toca `window` nada más cargarse y
// revienta en el entorno "node" de Jest. Solo se sustituye el paquete raíz:
// las piezas puras del hit test se cargan abajo desde phaser/src, reales.
jest.mock("phaser", () => ({ __esModule: true, default: {} }));

import RoomItemsManager, { ITEM_INTERACTIVE_CONFIG } from "./RoomItemsManager";
import type IsoGrid from "../iso/IsoGrid";

/* eslint-disable @typescript-eslint/no-var-requires */
const CreatePixelPerfectHandler = require("phaser/src/input/CreatePixelPerfectHandler.js");
const Frame = require("phaser/src/textures/Frame.js");
const TransformXY = require("phaser/src/math/TransformXY.js");
/* eslint-enable @typescript-eslint/no-var-requires */

/**
 * Área de clic de los muebles: alpha real del frame actual (pixelPerfect).
 *
 * Se ejecuta con el Jest de apps/api (ver la cabecera de iso/NavGrid.spec.ts):
 *
 *   cd apps/api && npx jest --rootDir ../.. \
 *     --testMatch "**\/apps/game/src/game/systems/RoomItemsManager.hitArea.spec.ts"
 *
 * El mueble se crea con el `addItem` real. De Phaser se usan los módulos
 * reales CreatePixelPerfectHandler, Frame y TransformXY; lo que no carga sin
 * navegador se replica línea a línea y se indica dónde vive el original.
 */

// ── geometría real del proyecto (mapa 64x32, tileset 64x64, offset 0) ──
const TW = 64, TH = 32, GROUND_OFFSET_Y = 64;

const groundAnchor = (tx: number, ty: number) => ({
  x: ((tx - ty) * TW) / 2 + TW / 2,
  y: ((tx + ty) * TH) / 2 + GROUND_OFFSET_Y,
});

/** Réplica de IsoGrid.groundDiamond: 4 vértices, horario desde arriba. */
const groundDiamond = (tx: number, ty: number) => {
  const a = groundAnchor(tx, ty);
  return [
    { x: a.x, y: a.y - TH },
    { x: a.x + TW / 2, y: a.y - TH / 2 },
    { x: a.x, y: a.y },
    { x: a.x - TW / 2, y: a.y - TH / 2 },
  ];
};

function insideDiamond(d: { x: number; y: number }[], px: number, py: number) {
  const cx = d[0].x, cy = (d[0].y + d[2].y) / 2;
  return Math.abs(px - cx) / (TW / 2) + Math.abs(py - cy) / (TH / 2) <= 1;
}

const grid = {
  elevationStep: TH / 2,
  groundAnchor,
  groundDiamond,
  worldToGroundTile: () => null,
  footprintAnchor: (tiles: { x: number; y: number }[]) => {
    const front = tiles[0];
    return { ...groundAnchor(front.x, front.y), frontTile: front };
  },
} as unknown as IsoGrid;

// ── PNG sintético: tira 512x128, 4 caras de 128x128 (como items/…tbclmu.png) ──
const SHEET_W = 512, SHEET_H = 128, FRAME = 128;
const alpha = new Uint8Array(SHEET_W * SHEET_H);

function paint(face: number, x0: number, y0: number, x1: number, y1: number) {
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) alpha[y * SHEET_W + face * FRAME + x] = 255;
}

// Coordenadas LOCALES de frame. La casilla 1x1 cae en x 32..96, y 96..128.
// Cara 0: cuerpo arriba del rombo + dos patas; aire entre las patas.
paint(0, 26, 13, 102, 96);
paint(0, 26, 96, 36, 128);
paint(0, 92, 96, 102, 128);
// Cara 1: bloque macizo que llega al suelo; aire arriba.
paint(1, 40, 60, 88, 128);

const BODY_TOP = { x: 64, y: 30 }; // opaco en cara 0, transparente en cara 1
const BETWEEN_LEGS = { x: 64, y: 112 }; // transparente en cara 0, opaco en cara 1
const SIDE_AIR = { x: 12, y: 50 }; // transparente en ambas caras

const frames = new Map<string, any>();

/** Réplica de TextureManager.getPixelAlpha (phaser/src/textures/TextureManager.js:1475). */
const textureManager = {
  getPixelAlpha(x: number, y: number, _key: string, frameName: string) {
    const frame = frames.get(frameName);
    if (!frame) return null;
    x -= frame.x;
    y -= frame.y;
    const data = frame.data.cut;
    x += data.x;
    y += data.y;
    if (x >= data.x && x < data.r && y >= data.y && y < data.b) {
      return alpha[Math.floor(y) * SHEET_W + Math.floor(x)];
    }
    return null;
  },
};

function makeScene() {
  const texture: any = { key: "sofa", source: [{ width: SHEET_W, height: SHEET_H }] };
  frames.clear();
  texture.has = (name: string) => frames.has(name);
  texture.add = (name: string, _src: number, x: number, y: number, w: number, h: number) => {
    const frame = new Frame(texture, name, 0, x, y, w, h);
    frames.set(name, frame);
    return frame;
  };

  const calls = { setInteractive: 0, disableInteractive: 0 };

  const makeSprite = (x: number, y: number, _key: string, frameName: string) => {
    const sprite: any = {
      x, y, rotation: 0, scaleX: 1, scaleY: 1, originX: 0.5, originY: 0.5,
      texture, frame: frames.get(frameName), input: null,
      get displayOriginX() { return this.originX * this.frame.width; },
      get displayOriginY() { return this.originY * this.frame.height; },
      setOrigin(ox: number, oy: number) { this.originX = ox; this.originY = oy; return this; },
      setPosition(px: number, py: number) { this.x = px; this.y = py; return this; },
      setFrame(name: string) { this.frame = frames.get(name); return this; },
      setDepth() { return this; },
      on() { return this; },
      // Réplica de InputPlugin.setHitArea con config pixelPerfect
      // (phaser/src/input/InputPlugin.js:2389-2398).
      setInteractive(config: any) {
        calls.setInteractive++;
        this.input = config.pixelPerfect
          ? {
              hitArea: {},
              hitAreaCallback: CreatePixelPerfectHandler(textureManager, config.alphaTolerance ?? 1),
            }
          : { hitArea: config.hitArea, hitAreaCallback: config.hitAreaCallback };
        return this;
      },
      disableInteractive() { calls.disableInteractive++; return this; },
    };
    return sprite;
  };

  const scene = {
    textures: { exists: () => true, get: () => texture },
    add: { sprite: makeSprite },
  };

  return { scene, texture, calls };
}

/**
 * Réplica de InputManager.hitTest + pointWithinHitArea
 * (phaser/src/input/InputManager.js): mundo → local con TransformXY real,
 * se suma displayOrigin y se llama al hitAreaCallback.
 */
function hits(sprite: any, worldX: number, worldY: number): boolean {
  const p = TransformXY(worldX, worldY, sprite.x, sprite.y, sprite.rotation, sprite.scaleX, sprite.scaleY);
  const lx = p.x + sprite.displayOriginX;
  const ly = p.y + sprite.displayOriginY;
  return Boolean(sprite.input?.hitAreaCallback(sprite.input.hitArea, lx, ly, sprite));
}

/** Punto de mundo que cae en el píxel local (lx, ly) del frame del sprite. */
const worldOf = (sprite: any, l: { x: number; y: number }) => ({
  x: sprite.x - sprite.displayOriginX + l.x,
  y: sprite.y - sprite.displayOriginY + l.y,
});

const clickLocal = (sprite: any, l: { x: number; y: number }) => {
  const w = worldOf(sprite, l);
  return hits(sprite, w.x, w.y);
};

const TILE = { x: 12, y: 12 };

function placeSofa(overrides: Partial<{ rotation: number; elevation: number; worldData: any }> = {}) {
  const { scene, texture, calls } = makeScene();
  const manager = new RoomItemsManager(scene as any, grid);
  const sprite: any = manager.addItem(
    {
      id: "sofa-1",
      x: TILE.x,
      y: TILE.y,
      rotation: overrides.rotation ?? 0,
      elevation: overrides.elevation ?? 0,
      item: {
        worldData: {
          kind: "FURNITURE",
          directions: 4,
          width: SHEET_W,
          height: SHEET_H,
          engineData: { frameWidth: FRAME, frameHeight: FRAME },
          footprintWidth: 1,
          footprintHeight: 1,
          ...overrides.worldData,
        },
      },
    },
    texture.key,
  );
  return { manager, sprite, texture, calls };
}

describe("hit area pixelPerfect · configuración", () => {
  it("addItem registra el sprite con pixelPerfect, alphaTolerance 1 y cursor de mano", () => {
    expect(ITEM_INTERACTIVE_CONFIG).toEqual({
      pixelPerfect: true,
      alphaTolerance: 1,
      useHandCursor: true,
    });

    const { sprite, calls } = placeSofa();
    expect(calls.setInteractive).toBe(1);
    expect(sprite.input.hitAreaCallback).toBeInstanceOf(Function);
  });

  it("no cambia el render: frame de la cara, origin (0.5, 1) y ancla de la casilla", () => {
    const { sprite } = placeSofa();
    const anchor = groundAnchor(TILE.x, TILE.y);
    expect(sprite.frame.width).toBe(FRAME);
    expect(sprite.frame.height).toBe(FRAME);
    expect(sprite.frame.cutX).toBe(0);
    expect([sprite.originX, sprite.originY]).toEqual([0.5, 1]);
    expect([sprite.x, sprite.y]).toEqual([anchor.x, anchor.y]);
  });
});

describe("hit area pixelPerfect · transparente vs opaco", () => {
  it("click sobre píxel transparente NO selecciona", () => {
    const { sprite } = placeSofa();
    expect(clickLocal(sprite, SIDE_AIR)).toBe(false);
  });

  it("click sobre píxel opaco SÍ selecciona", () => {
    const { sprite } = placeSofa();
    expect(clickLocal(sprite, BODY_TOP)).toBe(true);
    expect(clickLocal(sprite, { x: 30, y: 120 })).toBe(true); // pata izquierda
  });

  it("parte opaca FUERA del rombo de suelo SÍ selecciona", () => {
    const { sprite } = placeSofa();
    const w = worldOf(sprite, BODY_TOP);
    expect(insideDiamond(groundDiamond(TILE.x, TILE.y), w.x, w.y)).toBe(false);
    expect(hits(sprite, w.x, w.y)).toBe(true);
  });

  it("zona transparente DENTRO del rombo de suelo NO selecciona", () => {
    const { sprite } = placeSofa();
    const w = worldOf(sprite, BETWEEN_LEGS);
    expect(insideDiamond(groundDiamond(TILE.x, TILE.y), w.x, w.y)).toBe(true);
    expect(hits(sprite, w.x, w.y)).toBe(false);
  });

  it("fuera del frame nunca selecciona (sin espejo en coordenadas negativas)", () => {
    const { sprite } = placeSofa();
    expect(clickLocal(sprite, { x: -30, y: 120 })).toBe(false);
    expect(clickLocal(sprite, { x: 64, y: -10 })).toBe(false);
    expect(clickLocal(sprite, { x: 64, y: FRAME + 5 })).toBe(false);
  });
});

describe("hit area pixelPerfect · frame actual", () => {
  it("evalúa la cara con la que se creó el mueble", () => {
    const { sprite } = placeSofa({ rotation: 1 });
    expect(sprite.frame.cutX).toBe(FRAME);
    expect(clickLocal(sprite, BODY_TOP)).toBe(false);
    expect(clickLocal(sprite, BETWEEN_LEGS)).toBe(true);
  });

  it("tras rotar con setFrame (como FurnitureSocketSystem) usa el frame nuevo sin rehacer el hit area", () => {
    const { sprite, texture, calls } = placeSofa({ rotation: 0 });
    expect(clickLocal(sprite, BODY_TOP)).toBe(true);
    expect(clickLocal(sprite, BETWEEN_LEGS)).toBe(false);

    const name = `${texture.key}-room-1`;
    if (!texture.has(name)) texture.add(name, 0, FRAME, 0, FRAME, FRAME);
    sprite.setFrame(name);

    expect(calls.setInteractive).toBe(1);
    expect(clickLocal(sprite, BODY_TOP)).toBe(false);
    expect(clickLocal(sprite, BETWEEN_LEGS)).toBe(true);
  });

  it("repositionItem no rehace el hit area y el test sigue al sprite", () => {
    const { manager, sprite, calls } = placeSofa();
    const item = manager.getItem("sofa-1")!;
    item.tileX = TILE.x + 2;
    manager.repositionItem("sofa-1");

    expect(calls.setInteractive).toBe(1);
    expect(calls.disableInteractive).toBe(0);
    expect(sprite.x).toBe(groundAnchor(TILE.x + 2, TILE.y).x);
    expect(clickLocal(sprite, BODY_TOP)).toBe(true);
    expect(clickLocal(sprite, BETWEEN_LEGS)).toBe(false);
  });

  it("spriteOffset y elevación mueven el sprite y el área con él", () => {
    const { sprite } = placeSofa({
      elevation: 2,
      worldData: { spriteOffsetX: 10, spriteOffsetY: -6 },
    });
    const anchor = groundAnchor(TILE.x, TILE.y);
    expect(sprite.x).toBe(anchor.x + 10);
    expect(sprite.y).toBe(anchor.y - 2 * (TH / 2) - 6);
    expect(clickLocal(sprite, BODY_TOP)).toBe(true);
    expect(clickLocal(sprite, BETWEEN_LEGS)).toBe(false);
  });
});
