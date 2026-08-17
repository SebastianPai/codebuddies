// Cálculo compartido del `engineData` de un world item (footprints
// normalizados + frameWidth/frameHeight que usa el motor del juego para
// cortar el spritesheet). Extraído de ItemsService para que
// WorldItemDataService (usado por /admin/world-items, la config
// "avanzada" que se edita por separado del alta inicial del item) pueda
// recalcularlo también -- antes solo ItemsService lo hacía, así que
// cualquier cambio hecho desde /admin/world-items dejaba el engineData
// (y por lo tanto cuántas caras muestra el juego) desincronizado del resto
// de los datos.

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

const CARDINAL_DIRECTIONS = ['NORTH', 'EAST', 'SOUTH', 'WEST'];

function createRectTiles(width: number, height: number) {
  const tiles: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < Math.max(1, height); y++) {
    for (let x = 0; x < Math.max(1, width); x++) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

function normalizeTiles(source: any, fallback: Array<{ x: number; y: number }>) {
  if (!Array.isArray(source)) return fallback;

  return source
    .map((tile) => ({ x: Number(tile?.x), y: Number(tile?.y) }))
    .filter((tile) => Number.isInteger(tile.x) && Number.isInteger(tile.y));
}

function normalizeOrigin(
  source: any,
  occupied: Array<{ x: number; y: number }>,
) {
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

function calculateBounds(tiles: Array<{ x: number; y: number }>) {
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

export function buildWorldEngineData(data: EngineDataInput) {
  const faceCount = Math.max(1, Number(data.faceCount) || 4);
  const fallbackTiles = createRectTiles(
    Number(data.footprintWidth) || 1,
    Number(data.footprintHeight) || 1,
  );

  const normalizeMap = (source: any, fallback: any[]) => {
    const result: Record<string, any> = {};
    CARDINAL_DIRECTIONS.forEach((direction) => {
      const entry = source?.[direction] || {};
      const occupied = normalizeTiles(entry.occupied, fallback);
      const origin = normalizeOrigin(entry.origin, occupied);

      result[direction] = {
        occupied,
        origin,
        bounds: calculateBounds(occupied),
      };
    });
    return result;
  };

  const normalizedFootprints = normalizeMap(data.footprints, fallbackTiles);
  const normalizedSurfaces = normalizeMap(data.surfaces, []);

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
