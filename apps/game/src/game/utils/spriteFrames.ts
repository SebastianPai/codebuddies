// Cómo cortar el spritesheet horizontal de un world item según cuántas
// "caras" tiene (WorldItemData.directions): 1 = imagen estática, 2 = frente
// y costado (se reusan: N/S = frame 0, E/O = frame 1), 4 = una columna por
// rotación. Antes esto estaba hardcodeado a 4 (`width / 4`, `frameWidth *
// rotation`) en BuildSystem / RoomItemsManager / FurnitureSocketSystem /
// LobbyScene, así que un sprite de 2 caras se leía fuera de los límites en
// las rotaciones E/O.
//
// La rotación lógica sigue siendo 0-3 (el footprint rota por las 4
// direcciones); acá solo se envuelve el índice de FRAME al número de caras.

export function getFaceCount(worldData: any): 1 | 2 | 4 {
  const n = Math.trunc(Number(worldData?.directions));
  return n === 1 || n === 2 ? n : 4;
}

export function getSpriteFrameWidth(worldData: any): number {
  const fromEngine = Number(worldData?.engineData?.frameWidth);
  if (Number.isFinite(fromEngine) && fromEngine > 0) return fromEngine;
  const width = Number(worldData?.width) || 4;
  return Math.max(1, Math.floor(width / getFaceCount(worldData)));
}

export function getSpriteFrameHeight(worldData: any): number {
  const fromEngine = Number(worldData?.engineData?.frameHeight);
  if (Number.isFinite(fromEngine) && fromEngine > 0) return fromEngine;
  return Math.max(1, Number(worldData?.height) || 1);
}

/**
 * Índice de frame (columna) para una rotación 0-3, envuelto al número de
 * caras: 1 → siempre 0 · 2 → N/S=0, E/O=1 · 4 → 0,1,2,3.
 */
export function getSpriteFrameIndex(rotation: number, worldData: any): number {
  const faces = getFaceCount(worldData);
  return ((Math.trunc(Number(rotation) || 0) % faces) + faces) % faces;
}

/** ¿El sprite tiene más de una cara para rotar? (1 cara = no rota) */
export function isSpriteRotatable(worldData: any): boolean {
  if (worldData?.rotatable === false) return false;
  return getFaceCount(worldData) > 1;
}
