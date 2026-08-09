export type IsoDirection = "NORTH" | "EAST" | "SOUTH" | "WEST";

export type IsoTile = {
  x: number;
  y: number;
};

export type IsoDirectionalFootprint = {
  occupied: IsoTile[];
  origin: IsoTile;
  bounds?: {
    width: number;
    height: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
};

const DIRECTIONS: IsoDirection[] = ["NORTH", "EAST", "SOUTH", "WEST"];

export function directionFromRotation(rotation = 0): IsoDirection {
  return DIRECTIONS[((rotation % 4) + 4) % 4];
}

export function getDirectionalFootprint(
  worldData: any,
  rotation = 0,
): IsoDirectionalFootprint {
  const direction = directionFromRotation(rotation);
  const engineFootprint = worldData?.engineData?.footprints?.[direction];
  const directFootprint = worldData?.footprints?.[direction];
  const footprint = engineFootprint || directFootprint;

  if (footprint?.occupied?.length) {
    return {
      occupied: normalizeTiles(footprint.occupied),
      origin: normalizeOrigin(footprint.origin, footprint.occupied),
      bounds: footprint.bounds || calculateBounds(footprint.occupied),
    };
  }

  const width = Math.max(1, Number(worldData?.footprintWidth) || 1);
  const height = Math.max(1, Number(worldData?.footprintHeight) || 1);
  const occupied = createRectTiles(width, height);

  return {
    occupied,
    origin: { x: 0, y: 0 },
    bounds: calculateBounds(occupied),
  };
}

export function getDirectionalSurface(worldData: any, rotation = 0) {
  const direction = directionFromRotation(rotation);
  const surface =
    worldData?.engineData?.surfaces?.[direction] || worldData?.surfaces?.[direction];

  if (!surface?.occupied?.length) {
    return {
      occupied: [],
      origin: { x: 0, y: 0 },
      bounds: calculateBounds([]),
    };
  }

  return {
    occupied: normalizeTiles(surface.occupied),
    origin: normalizeOrigin(surface.origin, surface.occupied),
    bounds: surface.bounds || calculateBounds(surface.occupied),
  };
}

export function toWorldTiles(
  tileX: number,
  tileY: number,
  footprint: IsoDirectionalFootprint,
) {
  return footprint.occupied.map((tile) => ({
    x: tileX + tile.x - footprint.origin.x,
    y: tileY + tile.y - footprint.origin.y,
  }));
}

export function getFootprintSize(footprint: IsoDirectionalFootprint) {
  return footprint.bounds || calculateBounds(footprint.occupied);
}

function createRectTiles(width: number, height: number) {
  const tiles: IsoTile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

function normalizeTiles(tiles: any[]): IsoTile[] {
  return tiles
    .map((tile) => ({ x: Number(tile?.x), y: Number(tile?.y) }))
    .filter((tile) => Number.isInteger(tile.x) && Number.isInteger(tile.y));
}

function normalizeOrigin(origin: any, occupied: any[]) {
  const normalized = { x: Number(origin?.x), y: Number(origin?.y) };
  const tiles = normalizeTiles(occupied);

  if (
    Number.isInteger(normalized.x) &&
    Number.isInteger(normalized.y) &&
    tiles.some((tile) => tile.x === normalized.x && tile.y === normalized.y)
  ) {
    return normalized;
  }

  return tiles[0] || { x: 0, y: 0 };
}

function calculateBounds(tiles: any[]) {
  const normalized = normalizeTiles(tiles);
  if (!normalized.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  const xs = normalized.map((tile) => tile.x);
  const ys = normalized.map((tile) => tile.y);
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
