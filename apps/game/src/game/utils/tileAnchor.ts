/**
 * Calibración visual del artwork de un world item (`WorldItemData.
 * spriteOffsetX/Y` en la DB). Corre SOLO el sprite en pantalla; el ancla de
 * la tile, el footprint, la profundidad, la colisión y la interacción se
 * calculan como siempre y NO lo usan. La fórmula es siempre:
 *
 *   finalScreenX = baseScreenX + spriteOffsetX
 *   finalScreenY = baseScreenY + spriteOffsetY
 *
 * Este es el único offset legítimo del sistema: es un DATO DEL ASSET
 * (configurable por item desde el editor web), no una constante global para
 * compensar un error geométrico. La geometría del mundo — dónde está el
 * suelo de un tile, dónde apoya un mueble, dónde están los pies de un
 * personaje — vive entera en `iso/IsoGrid.ts` y se deriva del tileset.
 *
 * NOTA HISTÓRICA — este archivo contenía además tres constantes calibradas
 * a ojo que ya no existen:
 *
 *   TILE_VISUAL_Y_OFFSET = 16        → era (tilesetTileHeight − mapTileHeight)/2
 *   getFurnitureAnchorY  = y + TH·1.5 + 16 → era y + tilesetTileHeight
 *   PLAYER_Y_OFFSET      = −20       → suplía la distancia real del origen
 *                                      del Container a los pies del avatar,
 *                                      que depende de los slots y ahora se
 *                                      MIDE (ver ModularPlayer)
 *
 * Las dos primeras son ahora `IsoGrid.groundAnchor()` / `groundOffsetY`,
 * derivadas del tileset en runtime. La tercera es
 * `ModularPlayer.getFootOffsetY()`, medida del avatar ya construido.
 *
 * El offset de artwork es POR DIRECCIÓN: `worldData.spriteOffsets` es un
 * mapa { NORTH:{x,y}, EAST, SOUTH, WEST } (cada frame del spritesheet puede
 * traer padding distinto). Si el mapa no está (item viejo), se cae a las
 * columnas escalares `spriteOffsetX/Y`. La rotación 0-3 mapea a
 * NORTH/EAST/SOUTH/WEST igual que `directionFromRotation()` en IsoFootprint.
 *
 * Se aplica en UN solo lugar por cada forma de render, para que el editor
 * web, el ghost de construcción y el objeto ya colocado muestren el mueble
 * exactamente en la misma posición:
 *   - RoomItemsManager.addItem  → objeto colocado + carga inicial de la sala
 *   - BuildSystem.update        → ghost de "mueble en mano"
 *   - FurnitureSocketSystem.handleItemMoved / handleItemRotated
 */
type SpriteOffsetPair = { x?: number | null; y?: number | null };

type SpriteOffsetSource =
  | {
      spriteOffsetX?: number | null;
      spriteOffsetY?: number | null;
      spriteOffsets?: Partial<Record<string, SpriteOffsetPair>> | null;
    }
  | null
  | undefined;

const SPRITE_OFFSET_DIRECTIONS = ["NORTH", "EAST", "SOUTH", "WEST"] as const;

export function getSpriteOffset(
  worldData: SpriteOffsetSource,
  rotation = 0,
): { x: number; y: number } {
  const direction =
    SPRITE_OFFSET_DIRECTIONS[((Math.trunc(rotation) % 4) + 4) % 4];
  const perDirection = worldData?.spriteOffsets?.[direction];

  if (perDirection) {
    return {
      x: normalizeSpriteOffset(perDirection.x),
      y: normalizeSpriteOffset(perDirection.y),
    };
  }

  return {
    x: normalizeSpriteOffset(worldData?.spriteOffsetX),
    y: normalizeSpriteOffset(worldData?.spriteOffsetY),
  };
}

function normalizeSpriteOffset(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Suma `getSpriteOffset()` in-place sobre cualquier objeto con x/y (un
 * Phaser.GameObjects.Sprite ya posicionado en su ancla de suelo).
 */
export function applySpriteOffset(
  target: { x: number; y: number },
  worldData: SpriteOffsetSource,
  rotation = 0,
): void {
  const offset = getSpriteOffset(worldData, rotation);
  target.x += offset.x;
  target.y += offset.y;
}
