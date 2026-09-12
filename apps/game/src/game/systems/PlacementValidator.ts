import RoomItemsManager from "./RoomItemsManager";
import {
  getDirectionalFootprint,
  getFootprintSize,
  toWorldTiles,
} from "./IsoFootprint";
import type IsoGrid from "../iso/IsoGrid";

// Si el item no define maxStackHeight, antes se trataba como "sin límite" y
// una pila podía crecer hasta invadir el rango de profundidad de la fila de
// tile siguiente (cada nivel de elevación suma 100 al depth, una fila entera
// son 1000). Este tope por defecto deja margen de sobra (500 de 1000).
const DEFAULT_MAX_STACK_HEIGHT = 5;

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

}
