import {
  calculateBounds,
  createRectTiles,
  normalizeTiles,
  resolveDirectionalFootprints,
  resolveOrigin,
  type CardinalDirection,
  type FootprintTile,
} from "../iso/footprintRotation";

export type IsoDirection = CardinalDirection;

export type IsoTile = FootprintTile;

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

/**
 * Huella del mueble para una rotación concreta.
 *
 * Se resuelve SIEMPRE con `resolveDirectionalFootprints`, que completa por
 * rotación geométrica las direcciones que el admin no haya dibujado. Antes
 * esto leía `engineData.footprints[direction]` a pelo, y como el backend
 * rellenaba las direcciones ausentes copiando el rectángulo SIN rotar, un
 * mueble 3x1 girado a EAST seguía bloqueando 3 casillas en la orientación
 * equivocada — o sólo 1, si el editor había dejado ahí su default.
 *
 * El antiguo fallback `swapAxes` de esta función era código muerto: sólo se
 * alcanzaba cuando `worldData` no traía `footprints` ni `engineData`, cosa
 * que `buildWorldEngineData` nunca deja pasar.
 */
export function getDirectionalFootprint(
  worldData: any,
  rotation = 0,
): IsoDirectionalFootprint {
  const direction = directionFromRotation(rotation);
  const source =
    worldData?.engineData?.footprints ?? worldData?.footprints ?? null;

  const fallbackTiles = createRectTiles(
    Math.max(1, Number(worldData?.footprintWidth) || 1),
    Math.max(1, Number(worldData?.footprintHeight) || 1),
  );

  const resolved = resolveDirectionalFootprints(source, fallbackTiles)[direction];

  return {
    occupied: resolved.occupied,
    origin: resolved.origin,
    bounds: calculateBounds(resolved.occupied),
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

  const occupied = normalizeTiles(surface.occupied);

  return {
    occupied,
    // Misma regla de origin que la huella: debe pertenecer a occupied.
    origin: resolveOrigin(surface.origin, occupied),
    bounds: calculateBounds(occupied),
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

// normalizeTiles / resolveOrigin / calculateBounds / createRectTiles vivían
// duplicados aquí. Ahora se importan de iso/footprintRotation.ts, que es la
// única definición y la que comparte semántica con el backend.
