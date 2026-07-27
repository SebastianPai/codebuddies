import Phaser from "phaser";
import BuildSystem from "./BuildSystem";
import PlacementValidator from "./PlacementValidator";
import { LobbySceneType } from "../types/LobbySceneType";

export default class FurniturePlacementSystem {
  private scene: LobbySceneType;

  private buildSystem: BuildSystem;

  private placementValidator: PlacementValidator;

  constructor(
    scene: LobbySceneType,
    buildSystem: BuildSystem,
    placementValidator: PlacementValidator,
  ) {
    this.scene = scene;
    this.buildSystem = buildSystem;
    this.placementValidator = placementValidator;
  }

  private handlePointerDown = (pointer: Phaser.Input.Pointer) => {
    const item = this.buildSystem.getCurrentItem();

    if (!item) return;

    const preview = this.buildSystem.getPreview();

    if (!preview) return;

    const worldPoint = this.scene.cameras.main.getWorldPoint(
      pointer.x,
      pointer.y,
    );

    const tileXY = this.scene.groundLayer.worldToTileXY(
      worldPoint.x,
      worldPoint.y,
      false,
    );

    if (!tileXY) return;

    const tx = Math.floor(tileXY.x);
    const ty = Math.floor(tileXY.y);

    if (!this.placementValidator.canPlace(tx, ty, item, this.buildSystem.getRotation())) {
      console.warn("❌ No se puede colocar aquí");

      return;
    }

    const socket = (this.scene.game as any).socket;

    console.log("🚀 ENVIANDO ITEM", {
      roomId: (this.scene.game as any).roomId,
      itemId: item.id,
      x: tx,
      y: ty,
      rotation: this.buildSystem.getRotation(),
    });

    const placementType = item.worldData?.placementType ?? "FLOOR";

    socket.emit("room:item:place", {
      roomId: (this.scene.game as any).roomId,
      itemId: item.id,
      x: tx,
      y: ty,
      rotation: this.buildSystem.getRotation(),
      ...(placementType === "WALL" && {
        wallSide: this.inferWallSide(tx, ty),
        wallOffset: 0,
      }),
    });

    this.buildSystem.stop();
  };

  initialize() {
    this.scene.input.on("pointerdown", this.handlePointerDown);
  }

  destroy() {
    this.scene.input.off("pointerdown", this.handlePointerDown);
  }

  private inferWallSide(tx: number, ty: number) {
    if (ty <= 0) return "NORTH";
    if (tx >= this.scene.map.width - 1) return "EAST";
    if (ty >= this.scene.map.height - 1) return "SOUTH";
    if (tx <= 0) return "WEST";

    return "NORTH";
  }
}
