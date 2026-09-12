import {
  buildWorldEngineData,
  resolveDirectionalFootprints,
  resolveOrigin,
  rotateFootprint,
} from './engine-data.util';

// La MISMA lógica vive replicada en el cliente porque no comparten paquete.
// Este import cruzado es lo que garantiza que no se desincronicen.
import {
  resolveDirectionalFootprints as clientResolve,
  resolveOrigin as clientResolveOrigin,
  rotateFootprint as clientRotate,
} from '../../../../../game/src/game/iso/footprintRotation';

type Tile = { x: number; y: number };

const sig = (tiles: Tile[]) =>
  tiles
    .map((t) => `${t.x},${t.y}`)
    .sort()
    .join(' ');

const ROW_3x1: Tile[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
];
const COL_1x3: Tile[] = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
];

const boundsOf = (tiles: Tile[]) => {
  const xs = tiles.map((t) => t.x);
  const ys = tiles.map((t) => t.y);
  return {
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
  };
};

// Réplica de IsoFootprint.toWorldTiles: casillas que ocupa realmente el
// mueble al colocarlo en (tileX, tileY).
const toWorldTiles = (
  tileX: number,
  tileY: number,
  fp: { occupied: Tile[]; origin: Tile },
) =>
  fp.occupied.map((t) => ({
    x: tileX + t.x - fp.origin.x,
    y: tileY + t.y - fp.origin.y,
  }));

describe('rotateFootprint', () => {
  it('gira 3x1 -> 1x3 -> 3x1 -> 1x3 y vuelve al origen a los 4 giros', () => {
    const north = { occupied: ROW_3x1, origin: { x: 2, y: 0 } };

    const east = rotateFootprint(north, 1);
    expect(boundsOf(east.occupied)).toEqual({ width: 1, height: 3 });
    expect(sig(east.occupied)).toBe(sig(COL_1x3));
    expect(east.origin).toEqual({ x: 0, y: 2 });

    const south = rotateFootprint(north, 2);
    expect(boundsOf(south.occupied)).toEqual({ width: 3, height: 1 });
    expect(south.origin).toEqual({ x: 0, y: 0 });

    const west = rotateFootprint(north, 3);
    expect(boundsOf(west.occupied)).toEqual({ width: 1, height: 3 });
    expect(west.origin).toEqual({ x: 0, y: 0 });

    const full = rotateFootprint(north, 4);
    expect(sig(full.occupied)).toBe(sig(north.occupied));
    expect(full.origin).toEqual(north.origin);
  });

  it('nunca reduce el número de casillas', () => {
    const shapes: Tile[][] = [
      ROW_3x1,
      COL_1x3,
      [{ x: 0, y: 0 }],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      // forma en L, donde el "tile frontal" por max(ty) y por max(tx+ty) difieren
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
      ],
    ];

    for (const occupied of shapes) {
      for (let steps = 0; steps < 8; steps++) {
        const out = rotateFootprint({ occupied, origin: occupied[0] }, steps);
        expect(out.occupied).toHaveLength(occupied.length);
      }
    }
  });

  it('el origin sigue perteneciendo a occupied tras cualquier rotación', () => {
    const shape = {
      occupied: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
      ],
      origin: { x: 2, y: 0 },
    };

    for (let steps = 0; steps < 4; steps++) {
      const out = rotateFootprint(shape, steps);
      expect(
        out.occupied.some(
          (t) => t.x === out.origin.x && t.y === out.origin.y,
        ),
      ).toBe(true);
    }
  });

  it('normaliza a minX/minY = 0 sin mover las casillas del mundo', () => {
    const shape = { occupied: ROW_3x1, origin: { x: 2, y: 0 } };

    for (let steps = 0; steps < 4; steps++) {
      const out = rotateFootprint(shape, steps);
      expect(Math.min(...out.occupied.map((t) => t.x))).toBe(0);
      expect(Math.min(...out.occupied.map((t) => t.y))).toBe(0);
      // La casilla del origin siempre cae sobre la casilla de colocación.
      const world = toWorldTiles(10, 10, out);
      expect(world).toContainEqual({ x: 10, y: 10 });
    }
  });
});

describe('resolveOrigin', () => {
  it('acepta un origin que pertenece a occupied', () => {
    expect(resolveOrigin({ x: 2, y: 0 }, ROW_3x1)).toEqual({ x: 2, y: 0 });
  });

  it('cae de forma determinista a occupied[0] si no pertenece', () => {
    expect(resolveOrigin({ x: 5, y: 5 }, ROW_3x1)).toEqual({ x: 0, y: 0 });
    expect(resolveOrigin(undefined, ROW_3x1)).toEqual({ x: 0, y: 0 });
    expect(resolveOrigin({ x: 'a', y: 1 }, ROW_3x1)).toEqual({ x: 0, y: 0 });
  });

  it('coincide exactamente con la implementación del cliente', () => {
    const cases: unknown[] = [
      { x: 2, y: 0 },
      { x: 5, y: 5 },
      undefined,
      null,
      { x: 1.5, y: 0 },
      { x: -1, y: 0 },
    ];
    for (const origin of cases) {
      expect(resolveOrigin(origin, ROW_3x1)).toEqual(
        clientResolveOrigin(origin, ROW_3x1),
      );
    }
  });
});

describe('resolveDirectionalFootprints', () => {
  const rect3x1 = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ];

  it('A) sin ninguna dirección dibujada: deriva las 4 por rotación', () => {
    const out = resolveDirectionalFootprints(null, rect3x1);

    expect(boundsOf(out.NORTH.occupied)).toEqual({ width: 3, height: 1 });
    expect(boundsOf(out.EAST.occupied)).toEqual({ width: 1, height: 3 });
    expect(boundsOf(out.SOUTH.occupied)).toEqual({ width: 3, height: 1 });
    expect(boundsOf(out.WEST.occupied)).toEqual({ width: 1, height: 3 });
  });

  it('B) sólo NORTH/SOUTH dibujadas (default del editor en E/W): E/W se derivan', () => {
    const source = {
      NORTH: { occupied: ROW_3x1, origin: { x: 2, y: 0 } },
      SOUTH: { occupied: ROW_3x1, origin: { x: 2, y: 0 } },
      // lo que deja createDefaultFootprint() del editor web:
      EAST: { occupied: [{ x: 0, y: 0 }], origin: { x: 0, y: 0 } },
      WEST: { occupied: [{ x: 0, y: 0 }], origin: { x: 0, y: 0 } },
    };

    const out = resolveDirectionalFootprints(source, rect3x1);

    expect(out.NORTH.occupied).toHaveLength(3);
    expect(out.EAST.occupied).toHaveLength(3);
    expect(out.SOUTH.occupied).toHaveLength(3);
    expect(out.WEST.occupied).toHaveLength(3);
    expect(boundsOf(out.EAST.occupied)).toEqual({ width: 1, height: 3 });
    expect(boundsOf(out.WEST.occupied)).toEqual({ width: 1, height: 3 });
  });

  it('C) las 4 dibujadas a mano: se respetan tal cual', () => {
    const source = {
      NORTH: { occupied: ROW_3x1, origin: { x: 2, y: 0 } },
      EAST: { occupied: COL_1x3, origin: { x: 0, y: 2 } },
      SOUTH: { occupied: ROW_3x1, origin: { x: 0, y: 0 } },
      WEST: { occupied: COL_1x3, origin: { x: 0, y: 0 } },
    };

    const out = resolveDirectionalFootprints(source, rect3x1);

    expect(out.NORTH.origin).toEqual({ x: 2, y: 0 });
    expect(out.EAST.origin).toEqual({ x: 0, y: 2 });
    expect(out.SOUTH.origin).toEqual({ x: 0, y: 0 });
    expect(out.WEST.origin).toEqual({ x: 0, y: 0 });
  });

  it('un item genuinamente 1x1 no cambia en ninguna dirección', () => {
    const one = [{ x: 0, y: 0 }];
    const source = {
      NORTH: { occupied: one, origin: { x: 0, y: 0 } },
      EAST: { occupied: one, origin: { x: 0, y: 0 } },
      SOUTH: { occupied: one, origin: { x: 0, y: 0 } },
      WEST: { occupied: one, origin: { x: 0, y: 0 } },
    };

    const out = resolveDirectionalFootprints(source, one);

    for (const dir of ['NORTH', 'EAST', 'SOUTH', 'WEST']) {
      expect(out[dir].occupied).toEqual(one);
      expect(out[dir].origin).toEqual({ x: 0, y: 0 });
    }
  });

  it('un 2x2 es invariante a la rotación', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];
    const out = resolveDirectionalFootprints(null, square);
    for (const dir of ['NORTH', 'EAST', 'SOUTH', 'WEST']) {
      expect(sig(out[dir].occupied)).toBe(sig(square));
    }
  });

  it('coincide exactamente con la implementación del cliente', () => {
    const sources: any[] = [
      null,
      {
        NORTH: { occupied: ROW_3x1, origin: { x: 2, y: 0 } },
        SOUTH: { occupied: ROW_3x1, origin: { x: 2, y: 0 } },
        EAST: { occupied: [{ x: 0, y: 0 }], origin: { x: 0, y: 0 } },
        WEST: { occupied: [{ x: 0, y: 0 }], origin: { x: 0, y: 0 } },
      },
      {
        NORTH: { occupied: ROW_3x1, origin: { x: 5, y: 5 } }, // origin invalido
      },
      {
        EAST: { occupied: COL_1x3, origin: { x: 0, y: 2 } }, // base = EAST
      },
    ];

    for (const source of sources) {
      const server = resolveDirectionalFootprints(source, rect3x1);
      const client = clientResolve(source, rect3x1);

      for (const dir of ['NORTH', 'EAST', 'SOUTH', 'WEST'] as const) {
        expect(sig(server[dir].occupied)).toBe(sig(client[dir].occupied));
        expect(server[dir].origin).toEqual(client[dir].origin);
        // Y, lo que de verdad importa: las mismas casillas del mundo.
        expect(toWorldTiles(10, 10, server[dir])).toEqual(
          toWorldTiles(10, 10, client[dir]),
        );
      }
    }
  });

  it('rotateFootprint coincide con el cliente en una matriz de casos', () => {
    const shapes = [ROW_3x1, COL_1x3, [{ x: 0, y: 0 }]];
    for (const occupied of shapes) {
      for (const origin of occupied) {
        for (let steps = 0; steps < 5; steps++) {
          const s = rotateFootprint({ occupied, origin }, steps);
          const c = clientRotate({ occupied, origin }, steps);
          expect(sig(s.occupied)).toBe(sig(c.occupied));
          expect(s.origin).toEqual(c.origin);
        }
      }
    }
  });
});

describe('buildWorldEngineData', () => {
  it('persiste footprints rotados para las direcciones no dibujadas', () => {
    const out = buildWorldEngineData({
      width: 256,
      height: 64,
      footprintWidth: 3,
      footprintHeight: 1,
      faceCount: 4,
    });

    expect(out.footprints.NORTH.bounds).toMatchObject({ width: 3, height: 1 });
    expect(out.footprints.EAST.bounds).toMatchObject({ width: 1, height: 3 });
    expect(out.footprints.SOUTH.bounds).toMatchObject({ width: 3, height: 1 });
    expect(out.footprints.WEST.bounds).toMatchObject({ width: 1, height: 3 });
  });

  it('mantiene el contrato de salida (footprints + surfaces + engineData)', () => {
    const out = buildWorldEngineData({
      width: 256,
      height: 64,
      footprintWidth: 1,
      footprintHeight: 1,
      faceCount: 4,
    });

    expect(out).toHaveProperty('footprints');
    expect(out).toHaveProperty('surfaces');
    expect(out.engineData).toMatchObject({
      frameWidth: 64,
      frameHeight: 64,
      tileSize: { width: 64, height: 32 },
    });
  });

  it('no inventa superficies: una superficie vacía sigue vacía', () => {
    const out = buildWorldEngineData({
      width: 64,
      height: 64,
      footprintWidth: 3,
      footprintHeight: 1,
      faceCount: 1,
    });

    for (const dir of ['NORTH', 'EAST', 'SOUTH', 'WEST']) {
      expect(out.engineData.surfaces[dir].occupied).toEqual([]);
    }
  });
});
