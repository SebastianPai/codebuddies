import Phaser from "phaser";
import IsoGrid from "../iso/IsoGrid";

export interface LobbySceneType extends Phaser.Scene {
  groundLayer: Phaser.Tilemaps.TilemapLayer;
  map: Phaser.Tilemaps.Tilemap;
  // Autoridad geométrica de la sala activa. Undefined mientras se carga o se
  // cambia de sala (mismo ciclo de vida que groundLayer/map, ver
  // LobbyScene.destroyCurrentMap).
  isoGrid?: IsoGrid;
  refreshPathfinding?: () => void;
}
