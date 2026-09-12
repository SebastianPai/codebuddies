// Cálculo compartido del `engineData` de un world item (footprints
// normalizados + frameWidth/frameHeight que usa el motor del juego para
// cortar el spritesheet). Lo usan ItemsService (alta del item) y
// WorldItemDataService (/admin/world-items) — antes sólo el primero, así que
// editar desde /admin/world-items dejaba el engineData desincronizado.
//
// ─────────────────────────────────────────────────────────────────────────
// ROTACIÓN GEOMÉTRICA DE LA HUELLA
//
// Antes, las direcciones que el admin no hubiera dibujado se rellenaban
// COPIANDO el rectángulo sin rotar. Un escritorio 3x1 girado a EAST seguía
// bloqueando 3 casillas en la orientación de NORTH — o sólo 1, si el editor
// había dejado ahí su default de una casilla (syncDirections espeja N↔S y
// E↔O, no rota). El sprite giraba, la colisión no.
//
// Ahora se deriva por rotación real:  (x, y) → (maxY − y, x),  con el
// `origin` transformado por la misma fórmula.
//
// ⚠️ REPLICADO en apps/game/src/game/iso/footprintRotation.ts porque cliente
// y servidor tienen que calcular EXACTAMENTE la misma huella y hoy no
// comparten paquete. Hay un test que importa las DOS implementaciones y
// comprueba que coinciden en una matriz de casos
// (apps/game/src/game/iso/__tests__/footprint.test.mts). Si se toca una hay
// que tocar la otra; el test lo detecta.

export type EngineDataInput = {
  width?: number;
  height?: number;
  footprintWidth?: number;
  footprintHeight?: number;
  footprints?: any;
  surfaces?: any;
  // Cuántas caras/rotaciones tiene el spritesheet del item (1 = una sola
  // imagen estática, 4 = spritesheet horizontal NORTH/EAST/SOUTH/WEST).
  // No confundir con `CARDINAL_DIRECTIONS`, que son las 4 direcciones del
  // footprint isométrico -- eso siempre existe, sin importar cuántas caras
  // visuales tenga el sprite.
  faceCount?: number;
};

type Tile = { x: number; y: number };
type Footprint = { occupied: Tile[]; origin: Tile };

const CARDINAL_DIRECTIONS = ['NORTH', 'EAST', 'SOUTH', 'WEST'];

function createRectTiles(width: number, height: number): Tile[] {
  const tiles: Tile[] = [];
  for (let y = 0; y < Math.max(1, height); y++) {
    for (let x = 0; x < Math.max(1, width); x++) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

function normalizeTiles(source: any): Tile[] {
  if (!Array.isArray(source)) return [];

  return source
    .map((tile) => ({ x: Number(tile?.x), y: Number(tile?.y) }))
    .filter((tile) => Number.isInteger(tile.x) && Number.isInteger(tile.y));
}

/**
 * Regla ÚNICA de resolución del origin, idéntica a la del cliente: el origin
 * debe ser una de las casillas ocupadas; si el dato guardado no lo cumple,
 * se cae de forma determinista a la primera.
 *
 * No reescribe el dato persistido: sólo decide cómo LEER uno inconsistente.
 * Antes el cliente aplicaba esta regla y el servidor usaba el valor crudo
 * (`Number(origin?.x) || 0`), así que con un origin fuera de `occupied` el
 * servidor reservaba unas casillas y el cliente bloqueaba otras.
 */
export function resolveOrigin(source: any, occupied: Tile[]): Tile {
  const origin = { x: Number(source?.x), y: Number(source?.y) };

  if (
    Number.isInteger(origin.x) &&
    Number.isInteger(origin.y) &&
    occupied.some((tile) => tile.x === origin.x && tile.y === origin.y)
  ) {
    return origin;
  }

  return occupied[0] || { x: 0, y: 0 };
}

function calculateBounds(tiles: Tile[]) {
  if (!tiles.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  const xs = tiles.map((tile) => tile.x);
  const ys = tiles.map((tile) => tile.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Gira la huella `steps` × 90° en el sentido de las agujas del reloj.
 * El resultado se normaliza a minX = minY = 0; eso no cambia las casillas
 * que acaba ocupando el mueble porque el `origin` se desplaza con ellas.
 */
export function rotateFootprint(footprint: Footprint, steps: number): Footprint {
  const turns = ((Math.trunc(steps) % 4) + 4) % 4;

  let occupied = footprint.occupied.map((t) => ({ x: t.x, y: t.y }));
  let origin = { x: footprint.origin.x, y: footprint.origin.y };

  for (let i = 0; i < turns; i++) {
    const maxY = occupied.length
      ? Math.max(...occupied.map((t) => t.y))
      : origin.y;

    const turn = (t: Tile) => ({ x: maxY - t.y, y: t.x });

    occupied = occupied.map(turn);
    origin = turn(origin);
  }

  if (!occupied.length) return { occupied, origin };

  const minX = Math.min(...occupied.map((t) => t.x));
  const minY = Math.min(...occupied.map((t) => t.y));

  return {
    occupied: occupied.map((t) => ({ x: t.x - minX, y: t.y - minY })),
    origin: { x: origin.x - minX, y: origin.y - minY },
  };
}

/**
 * Completa las 4 direcciones.
 *
 * Una dirección dibujada a mano SIEMPRE gana. Sólo se deriva por rotación
 * una dirección "incompleta", y para detectarla sin inventar banderas
 * nuevas se usa el invariante geométrico: **un cuerpo rígido ocupa el mismo
 * número de casillas mire hacia donde mire**. Una dirección con menos
 * casillas que la que más tiene es dato incompleto, no diseño.
 *
 * Con eso los items ya configurados bien (todas las direcciones con el mismo
 * número de casillas) y los genuinamente 1x1 no cambian en absoluto.
 */
type FootprintSource =
  | Partial<Record<string, { occupied?: unknown; origin?: unknown }>>
  | null
  | undefined;

export function resolveDirectionalFootprints(
  source: FootprintSource,
  fallbackTiles: Tile[],
): Record<string, Footprint> {
  const authored = CARDINAL_DIRECTIONS.map((direction) => {
    const occupied = normalizeTiles(source?.[direction]?.occupied);
    return {
      occupied,
      origin: resolveOrigin(source?.[direction]?.origin, occupied),
    };
  });

  let baseIndex = 0;
  let baseCount = 0;
  authored.forEach((entry, index) => {
    if (entry.occupied.length > baseCount) {
      baseCount = entry.occupied.length;
      baseIndex = index;
    }
  });

  const base: Footprint =
    baseCount > 0
      ? authored[baseIndex]
      : { occupied: fallbackTiles, origin: resolveOrigin(undefined, fallbackTiles) };

  if (baseCount === 0) baseIndex = 0;

  const result: Record<string, Footprint> = {};

  CARDINAL_DIRECTIONS.forEach((direction, index) => {
    const entry = authored[index];

    if (baseCount > 0 && entry.occupied.length === baseCount) {
      result[direction] = entry;
      return;
    }

    result[direction] = rotateFootprint(base, index - baseIndex);
  });

  return result;
}

export function buildWorldEngineData(data: EngineDataInput) {
  const faceCount = Math.max(1, Number(data.faceCount) || 4);
  const fallbackTiles = createRectTiles(
    Number(data.footprintWidth) || 1,
    Number(data.footprintHeight) || 1,
  );

  const withBounds = (map: Record<string, Footprint>) => {
    const out: Record<string, any> = {};
    CARDINAL_DIRECTIONS.forEach((direction) => {
      const entry = map[direction];
      out[direction] = {
        occupied: entry.occupied,
        origin: entry.origin,
        bounds: calculateBounds(entry.occupied),
      };
    });
    return out;
  };

  const normalizedFootprints = withBounds(
    resolveDirectionalFootprints(data.footprints, fallbackTiles),
  );

  // Las superficies (dónde se puede apilar encima) NO se derivan por
  // rotación: una superficie vacía es una decisión válida — significa "no se
  // puede apilar en esta orientación" — a diferencia de una huella vacía,
  // que siempre es un dato incompleto. Aquí sólo se normaliza cada dirección
  // tal como venga.
  const normalizedSurfaces: Record<string, any> = {};
  CARDINAL_DIRECTIONS.forEach((direction) => {
    const occupied = normalizeTiles(data.surfaces?.[direction]?.occupied);
    normalizedSurfaces[direction] = {
      occupied,
      origin: resolveOrigin(data.surfaces?.[direction]?.origin, occupied),
      bounds: calculateBounds(occupied),
    };
  });

  return {
    footprints: normalizedFootprints,
    surfaces: normalizedSurfaces,
    engineData: {
      frameWidth: Math.max(1, Math.floor((Number(data.width) || 4) / faceCount)),
      frameHeight: Number(data.height) || 1,
      tileSize: { width: 64, height: 32 },
      directions: CARDINAL_DIRECTIONS,
      footprints: normalizedFootprints,
      surfaces: normalizedSurfaces,
    },
  };
}
