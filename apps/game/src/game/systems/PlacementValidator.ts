import RoomItemsManager from "./RoomItemsManager";
import {
  getDirectionalFootprint,
  getFootprintSize,
  toWorldTiles,
} from "./IsoFootprint";
import type IsoGrid from "../iso/IsoGrid";
import { depthFromTile } from "../iso/IsoDepth";

// Si el item no define maxStackHeight, antes se trataba como "sin límite" y
// una pila podía crecer hasta invadir el rango de profundidad de la fila de
// tile siguiente (cada nivel de elevación suma 100 al depth, una fila entera
// son 1000). Este tope por defecto deja margen de sobra (500 de 1000).
const DEFAULT_MAX_STACK_HEIGHT = 5;

// Casilla vecina de un bloque donde pegar otro bloque "en el aire", a la
// misma altura que el vecino (como poner un cubo en la cara lateral de otro).
export interface SideAttachTarget {
  x: number;
  y: number;
  elevation: number;
}

const SIDE_NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export default class PlacementValidator {
  private grid?: IsoGrid;

  private roomItems?: RoomItemsManager;

  configure(grid: IsoGrid, roomItems: RoomItemsManager) {
    this.grid = grid;
    this.roomItems = roomItems;
  }

  // excludeRoomItemId: al mover un mueble YA colocado, sus propias tiles no
  // deben contar como "ocupadas por otro" — si no, canPlace() lo vería
  // bloqueado por sí mismo apenas empieza a arrastrarse.
  canPlace(
    x: number,
    y: number,
    item: any,
    rotation = 0,
    excludeRoomItemId?: string,
  ): boolean {
    if (!this.grid || !this.roomItems) return false;
    if (!item) return false;
    if (!this.grid.contains(x, y)) return false;

    const worldData = item.worldData;
    const placementType = worldData?.placementType ?? "FLOOR";

    if (placementType === "WALL") return true;

    const footprint = getDirectionalFootprint(worldData, rotation);
    const { blocking: blockingTiles, occupied: occupiedTiles } = excludeRoomItemId
      ? this.roomItems.getOccupancyExcluding(excludeRoomItemId)
      : // getOccupiedTiles() cuenta CUALQUIER item ya colocado, colisionable o
        // no — antes solo se miraba blockingTiles (solo items colisionables),
        // así que un item no colisionable (alfombra, cuadro) nunca marcaba su
        // tile como ocupado y se podía apilar sin límite en el mismo lugar.
        { blocking: this.roomItems.getBlockingTiles(), occupied: this.roomItems.getOccupiedTiles() };
    let blocked = false;

    for (const tile of toWorldTiles(x, y, footprint)) {
      const tx = tile.x;
      const ty = tile.y;

      // Misma autoridad de suelo que la navegación: un mueble no se puede
      // colocar sobre una casilla que no es suelo (antes bastaba con que
      // hubiera CUALQUIER tile pintado, piezas de pared incluidas).
      if (!this.grid.isFloorTile(tx, ty)) return false;

      if (blockingTiles.has(`${tx},${ty}`) || occupiedTiles.has(`${tx},${ty}`)) {
        blocked = true;
      }
    }

    if (!blocked) return true;

    const stackTarget = this.roomItems.getStackTarget(x, y);
    if (
      !stackTarget ||
      !worldData?.canBeStacked ||
      getFootprintSize(footprint).width !== 1 ||
      getFootprintSize(footprint).height !== 1
    ) {
      return false;
    }

    const targetData = stackTarget.item?.worldData;
    const nextElevation =
      stackTarget.elevation + (targetData?.stackHeight ?? 1);
    const maxStackHeight = targetData?.maxStackHeight || DEFAULT_MAX_STACK_HEIGHT;

    return nextElevation <= maxStackHeight;
  }

  /**
   * Busca dónde pegar `item` al costado de otro bloque, flotando.
   *
   * El cursor apunta a un punto de pantalla; un objeto a elevación h se
   * dibuja h·elevationStep más arriba que su casilla, así que para cada h se
   * baja el punto esa distancia y se mira qué casilla cae ahí. Vale si esa
   * casilla es suelo de la sala (no se sale del mapa), está libre y tiene
   * al lado (4 vecinos) un bloque exactamente a esa altura. Si hay varias,
   * gana la que se dibuja más adelante (la que el jugador ve bajo el cursor).
   *
   * Solo para bloques 1x1 apilables y alturas ≥ 1: a altura 0 es colocar en
   * el suelo normal. El servidor repite la misma validación.
   */
  findSideAttach(
    worldX: number,
    worldY: number,
    item: any,
    rotation = 0,
  ): SideAttachTarget | null {
    if (!this.grid || !this.roomItems || !item) return null;

    const worldData = item.worldData;
    if (!worldData?.canBeStacked) return null;
    if ((worldData.placementType ?? "FLOOR") === "WALL") return null;

    const size = getFootprintSize(getDirectionalFootprint(worldData, rotation));
    if (size.width !== 1 || size.height !== 1) return null;

    // "x,y,h" de cada bloque colocado que no sea superficie, de pared ni
    // esté en el suelo.
    const blocks = new Set<string>();
    for (const placed of this.roomItems.getAll()) {
      const data = placed.item?.worldData;
      if (!placed.elevation || placed.wallSide || placed.state?.surface) continue;
      if (!data?.canBeStacked && !data?.allowsStacking) continue;
      blocks.add(`${placed.tileX},${placed.tileY},${placed.elevation}`);
    }
    if (blocks.size === 0) return null;

    const occupied = this.roomItems.getOccupiedTiles();
    const blocking = this.roomItems.getBlockingTiles();
    let best: SideAttachTarget | null = null;
    let bestDepth = -Infinity;

    for (let h = 1; h <= DEFAULT_MAX_STACK_HEIGHT; h++) {
      const tile = this.grid.worldToTileFloored(
        worldX,
        worldY + h * this.grid.elevationStep,
      );
      if (!tile || !this.grid.contains(tile.x, tile.y)) continue;
      if (!this.grid.isFloorTile(tile.x, tile.y)) continue;

      const key = `${tile.x},${tile.y}`;
      if (occupied.has(key) || blocking.has(key)) continue;

      const touchesBlock = SIDE_NEIGHBORS.some(([dx, dy]) =>
        blocks.has(`${tile.x + dx},${tile.y + dy},${h}`),
      );
      if (!touchesBlock) continue;

      const depth = depthFromTile(tile.x, tile.y, h);
      if (depth > bestDepth) {
        bestDepth = depth;
        best = { x: tile.x, y: tile.y, elevation: h };
      }
    }

    return best;
  }
}
