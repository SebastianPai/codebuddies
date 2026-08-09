import Phaser from "phaser";

export interface LobbySceneType extends Phaser.Scene {
  groundLayer: Phaser.Tilemaps.TilemapLayer;
  map: Phaser.Tilemaps.Tilemap;
  refreshPathfinding?: () => void;
}
