import Phaser from "phaser";
import RoomItemsManager from "./RoomItemsManager";
import {
  getDirectionalFootprint,
  getFootprintSize,
  toWorldTiles,
} from "./IsoFootprint";

export default class PlacementValidator {
  private map?: Phaser.Tilemaps.Tilemap;

  private groundLayer?: Phaser.Tilemaps.TilemapLayer;

  private roomItems?: RoomItemsManager;

  configure(
    map: Phaser.Tilemaps.Tilemap,
    groundLayer: Phaser.Tilemaps.TilemapLayer,
    roomItems: RoomItemsManager,
  ) {
    this.map = map;
    this.groundLayer = groundLayer;
    this.roomItems = roomItems;
  }

  canPlace(x: number, y: number, item: any, rotation = 0): boolean {
    if (!this.map || !this.groundLayer || !this.roomItems) return false;
    if (!item) return false;
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height)
      return false;

    const worldData = item.worldData;
    const placementType = worldData?.placementType ?? "FLOOR";

    if (placementType === "WALL") return true;

    const footprint = getDirectionalFootprint(worldData, rotation);
    const blockingTiles = this.roomItems.getBlockingTiles();
    let blocked = false;

    for (const tile of toWorldTiles(x, y, footprint)) {
      const tx = tile.x;
      const ty = tile.y;

      if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) {
        return false;
      }

      const groundTile = this.groundLayer.getTileAt(tx, ty);
      if (!groundTile || groundTile.index === -1) return false;

      if (blockingTiles.has(`${tx},${ty}`)) {
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

    return (
      !targetData?.maxStackHeight || nextElevation <= targetData.maxStackHeight
    );
  }

}
