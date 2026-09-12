// RoomItemsManager importa Phaser, que toca `window` nada más cargarse y
// revienta en el entorno "node" de Jest. `toLocalFootprintPolygons` es pura
// y no usa Phaser para nada, así que se sustituye el módulo por un stub en
// vez de añadir jsdom como dependencia.
jest.mock("phaser", () => ({ __esModule: true, default: {} }));

import { toLocalFootprintPolygons } from "./RoomItemsManager";

/**
 * Área de interacción de los muebles.
 *
 * Se ejecuta con el Jest de apps/api apuntando a este directorio (ver la
 * cabecera de iso/NavGrid.spec.ts). `toLocalFootprintPolygons` es pura, así
 * que estas pruebas no necesitan Phaser ni una escena.
 *
 * Punto-en-polígono replicado del algoritmo de Phaser.Geom.Polygon.Contains
 * (ray casting) para poder comprobar el resultado sin cargar el motor.
 */
function contains(flat: number[], px: number, py: number): boolean {
  let inside = false;
  const n = flat.length / 2;
  for (let i = -1, j = n - 1; ++i < n; j = i) {
    const xi = flat[i * 2];
    const yi = flat[i * 2 + 1];
    const xj = flat[j * 2];
    const yj = flat[j * 2 + 1];
    if (
      yi <= py && py < yj ||
      yj <= py && py < yi
    ) {
      if (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

// ── geometría real del proyecto (mapa 64x32, tileset 64x64, offset 0) ──
const TW = 64, TH = 32, GROUND_OFFSET_Y = 64, GROUND_OFFSET_X = 0;

const cellOrigin = (tx: number, ty: number) => ({
  x: ((tx - ty) * TW) / 2,
  y: ((tx + ty) * TH) / 2,
});

/** Réplica de IsoGrid.groundAnchor */
const groundAnchor = (tx: number, ty: number) => {
  const p = cellOrigin(tx, ty);
  return { x: p.x + TW / 2 + GROUND_OFFSET_X, y: p.y + GROUND_OFFSET_Y };
};

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

/** Réplica de IsoFootprint.toWorldTiles */
const toWorldTiles = (
  tileX: number,
  tileY: number,
  occupied: { x: number; y: number }[],
  origin: { x: number; y: number },
) => occupied.map((t) => ({ x: tileX + t.x - origin.x, y: tileY + t.y - origin.y }));

/**
 * Monta el hit area igual que RoomItemsManager.applyFootprintHitArea:
 * el sprite se ancla al tile frontal con origin(0.5, 1).
 */
function buildHitArea(
  tileX: number,
  tileY: number,
  occupied: { x: number; y: number }[],
  origin: { x: number; y: number },
  frame: { w: number; h: number },
  elevation = 0,
) {
  const tiles = toWorldTiles(tileX, tileY, occupied, origin);
  const diamonds = tiles.map((t) => groundDiamond(t.x, t.y));

  // ancla del footprint (IsoGrid.footprintAnchor): centro del bbox en X,
  // base del tile frontal (max tx+ty) en Y.
  let minX = Infinity, maxX = -Infinity, front = tiles[0], frontRow = -Infinity;
  for (const t of tiles) {
    const left = cellOrigin(t.x, t.y).x + GROUND_OFFSET_X;
    minX = Math.min(minX, left);
    maxX = Math.max(maxX, left + TW);
    const row = t.x + t.y;
    if (row > frontRow || (row === frontRow && t.x > front.x)) { frontRow = row; front = t; }
  }
  const spriteX = (minX + maxX) / 2;
  const spriteY = groundAnchor(front.x, front.y).y - elevation * (TH / 2);

  // origin(0.5, 1) => displayOrigin = (w/2, h)
  const polys = toLocalFootprintPolygons(
    diamonds,
    spriteX - frame.w / 2,
    spriteY - frame.h,
    elevation * (TH / 2),
  );

  // Phaser evalúa el hit area en local = (mundo - sprite.pos) + displayOrigin
  const toLocal = (wx: number, wy: number) => ({
    x: wx - spriteX + frame.w / 2,
    y: wy - spriteY + frame.h,
  });

  const hit = (wx: number, wy: number) => {
    const l = toLocal(wx, wy);
    return polys.some((p) => contains(p, l.x, l.y));
  };

  return { polys, tiles, hit, spriteX, spriteY, frame, groundAnchor, toLocal };
}

const rect = (w: number, h: number) => {
  const t: { x: number; y: number }[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) t.push({ x, y });
  return t;
};

describe("hit area por footprint · formas", () => {
  it.each([
    ["1x1", rect(1, 1), { x: 0, y: 0 }],
    ["2x1", rect(2, 1), { x: 0, y: 0 }],
    ["1x2", rect(1, 2), { x: 0, y: 0 }],
    ["2x2", rect(2, 2), { x: 0, y: 0 }],
  ])("%s genera un polígono por casilla ocupada", (_l, occupied, origin) => {
    const a = buildHitArea(12, 12, occupied, origin, { w: 128, h: 128 });
    expect(a.polys).toHaveLength(occupied.length);
    // cada polígono es un rombo de 4 vértices
    a.polys.forEach((p) => expect(p).toHaveLength(8));
  });

  it("el centro de CADA casilla ocupada cae dentro del área", () => {
    for (const occupied of [rect(1, 1), rect(2, 1), rect(1, 2), rect(2, 2)]) {
      const a = buildHitArea(12, 12, occupied, { x: 0, y: 0 }, { w: 128, h: 128 });
      for (const t of a.tiles) {
        const anchor = groundAnchor(t.x, t.y);
        expect(a.hit(anchor.x, anchor.y - TH / 2)).toBe(true);
      }
    }
  });

  it("una casilla vecina NO ocupada queda fuera del área", () => {
    const a = buildHitArea(12, 12, rect(1, 1), { x: 0, y: 0 }, { w: 128, h: 128 });
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
      const c = groundAnchor(12 + dx, 12 + dy);
      expect(a.hit(c.x, c.y - TH / 2)).toBe(false);
    }
  });
});

describe("hit area por footprint · mesa irregular de producción (5 casillas)", () => {
  // "mesa de madera": bounds 3x3, 5 casillas, origin (2,0). Dato REAL.
  const MESA = [
    { x: 2, y: 0 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    { x: 1, y: 2 },
  ];
  const ORIGIN = { x: 2, y: 0 };

  it("cubre exactamente las 5 casillas y ninguna más", () => {
    const a = buildHitArea(13, 13, MESA, ORIGIN, { w: 128, h: 128 });
    expect(a.polys).toHaveLength(5);

    const ocupadas = new Set(a.tiles.map((t) => `${t.x},${t.y}`));
    expect(ocupadas.size).toBe(5);

    // dentro de cada ocupada: sí
    for (const t of a.tiles) {
      const c = groundAnchor(t.x, t.y);
      expect(a.hit(c.x, c.y - TH / 2)).toBe(true);
    }

    // el hueco de la forma en L (la casilla que NO está ocupada dentro del
    // bounding box 3x3) debe quedar FUERA
    for (let dy = 0; dy <= 2; dy++) {
      for (let dx = 0; dx <= 2; dx++) {
        const tx = 13 + dx - ORIGIN.x;
        const ty = 13 + dy - ORIGIN.y;
        const esOcupada = ocupadas.has(`${tx},${ty}`);
        const c = groundAnchor(tx, ty);
        expect(a.hit(c.x, c.y - TH / 2)).toBe(esOcupada);
      }
    }
  });
});

describe("hit area por footprint · el aire del PNG deja pasar el click", () => {
  // Caso real: "estatua zeus grande", frame 167x240 sobre una casilla de
  // 64x32. El rectángulo del PNG cubría 2,6 x 7,5 casillas.
  const FRAME = { w: 167, h: 240 };

  it("un punto MUY arriba del sprite (aire) ya no es capturado", () => {
    const a = buildHitArea(12, 12, rect(1, 1), { x: 0, y: 0 }, FRAME);
    const anchor = groundAnchor(12, 12);

    // dentro del rect del PNG (el rect va de spriteY-240 a spriteY)
    for (const dy of [40, 80, 120, 200]) {
      const wy = anchor.y - dy;
      const local = a.toLocal(anchor.x, wy);
      // sigue dentro del rectángulo del frame...
      expect(local.y).toBeGreaterThanOrEqual(0);
      expect(local.y).toBeLessThanOrEqual(FRAME.h);
      // ...pero YA NO es clicable
      expect(a.hit(anchor.x, wy)).toBe(false);
    }
  });

  it("un punto a los lados del sprite (aire) tampoco es capturado", () => {
    const a = buildHitArea(12, 12, rect(1, 1), { x: 0, y: 0 }, FRAME);
    const anchor = groundAnchor(12, 12);
    for (const dx of [-70, -50, 50, 70]) {
      expect(a.hit(anchor.x + dx, anchor.y - TH / 2)).toBe(false);
    }
  });

  it("el centro de la huella SÍ sigue seleccionando el mueble", () => {
    const a = buildHitArea(12, 12, rect(1, 1), { x: 0, y: 0 }, FRAME);
    const anchor = groundAnchor(12, 12);
    expect(a.hit(anchor.x, anchor.y - TH / 2)).toBe(true);
  });

  it("cuantifica la reducción de superficie clicable", () => {
    const a = buildHitArea(12, 12, rect(1, 1), { x: 0, y: 0 }, FRAME);
    const rectArea = FRAME.w * FRAME.h; // 40.080 px²
    const diamondArea = (TW * TH) / 2; // 1.024 px²
    expect(rectArea).toBe(40080);
    expect(diamondArea).toBe(1024);
    // el área clicable pasa a ser ~2,5 % de la anterior
    expect(diamondArea / rectArea).toBeLessThan(0.03);
  });
});

describe("hit area por footprint · apilado", () => {
  it("un item elevado mantiene su área bajo el sprite (no en el suelo)", () => {
    const sinElev = buildHitArea(12, 12, rect(1, 1), { x: 0, y: 0 }, { w: 64, h: 64 }, 0);
    const conElev = buildHitArea(12, 12, rect(1, 1), { x: 0, y: 0 }, { w: 64, h: 64 }, 2);
    // mismos polígonos en local: el sprite sube y el área sube con él
    expect(conElev.polys).toEqual(sinElev.polys);
  });
});

describe("toLocalFootprintPolygons · casos límite", () => {
  it("descarta formas degeneradas de menos de 3 vértices", () => {
    expect(toLocalFootprintPolygons([[{ x: 0, y: 0 }, { x: 1, y: 1 }]], 0, 0)).toEqual([]);
    expect(toLocalFootprintPolygons([], 0, 0)).toEqual([]);
  });

  it("traslada al espacio local restando origen y elevación", () => {
    const d = [[{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }]];
    expect(toLocalFootprintPolygons(d, 10, 20, 0)).toEqual([[0, 0, 20, 20, 40, 40]]);
    expect(toLocalFootprintPolygons(d, 10, 20, 5)).toEqual([[0, -5, 20, 15, 40, 35]]);
  });
});
