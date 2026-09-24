import Phaser from "phaser";
import BuildSystem from "./BuildSystem";
import PlacementValidator from "./PlacementValidator";
import { LobbySceneType } from "../types/LobbySceneType";

export default class FurniturePlacementSystem {
  private scene: LobbySceneType;

  private buildSystem: BuildSystem;

  private placementValidator: PlacementValidator;

  // Colocación enviada al servidor y todavía sin respuesta. Con red lenta el
  // clic parecía no hacer nada y se repetía: cada clic mandaba otro
  // room:item:place y al volver la conexión aparecían todos los objetos. Una
  // sola colocación en vuelo a la vez; se libera con room:item:placed del
  // mismo item/tile, con room:item:error, o a los 10s.
  private pending: { itemId: string; x: number; y: number } | null = null;

  private pendingTimeout?: ReturnType<typeof setTimeout>;

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

    // Si hay un mueble ya colocado en modo "mover" (LobbyScene.movingRoomItem),
    // el ghost también viene de buildSystem.start(), pero el click debe
    // reposicionar ESE item (room:item:move, sin tocar inventario) en vez de
    // tratarse como colocar uno nuevo desde el inventario — eso lo maneja
    // LobbyScene.moveSelectedRoomItem().
    if ((this.scene as any).movingRoomItem) return;

    if (this.pending) return;

    const preview = this.buildSystem.getPreview();

    if (!preview) return;

    const grid = this.scene.isoGrid;
    if (!grid) return;

    const tile = grid.pointerToTile(this.scene.cameras.main, pointer);

    if (!tile) return;

    const tx = tile.x;
    const ty = tile.y;

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

    this.pending = { itemId: item.id, x: tx, y: ty };
    preview.setAlpha(0.25);
    if (this.pendingTimeout) clearTimeout(this.pendingTimeout);
    this.pendingTimeout = setTimeout(() => this.releasePending(), 10000);

    // Colocación continua: el ghost sigue con el mismo mueble y la misma
    // rotación mientras queden unidades en el inventario. Si el servidor
    // rechaza una colocación (room:item:error) el ghost se corta desde
    // FurnitureSocketSystem, así el contador local nunca queda por delante.
    if (this.buildSystem.consumeOne() <= 0) {
      this.buildSystem.stop();
    }
  };

  /**
   * Llamado por FurnitureSocketSystem. `placed` = payload de
   * room:item:placed (puede ser de otro jugador: solo libera si coincide
   * item + tile con lo que está en vuelo); sin argumento = error, libera.
   */
  releasePending(placed?: { itemId?: string; item?: { id?: string }; x?: number; y?: number }) {
    if (!this.pending) return;
    if (placed) {
      const placedItemId = placed.itemId ?? placed.item?.id;
      if (
        placedItemId !== this.pending.itemId ||
        placed.x !== this.pending.x ||
        placed.y !== this.pending.y
      ) {
        return;
      }
    }

    this.pending = null;
    if (this.pendingTimeout) clearTimeout(this.pendingTimeout);
    this.pendingTimeout = undefined;
    this.buildSystem.getPreview()?.setAlpha(0.6);
  }

  initialize() {
    this.scene.input.on("pointerdown", this.handlePointerDown);
  }

  destroy() {
    this.scene.input.off("pointerdown", this.handlePointerDown);
    if (this.pendingTimeout) clearTimeout(this.pendingTimeout);
  }

  private inferWallSide(tx: number, ty: number) {
    if (ty <= 0) return "NORTH";
    if (tx >= this.scene.map.width - 1) return "EAST";
    if (ty >= this.scene.map.height - 1) return "SOUTH";
    if (tx <= 0) return "WEST";

    return "NORTH";
  }
}
