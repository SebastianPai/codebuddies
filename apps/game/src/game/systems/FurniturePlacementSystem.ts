import { getPlacementColor } from "./buildPlacementEvents";
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

  // Colocar en fila: con Shift (o el botón "Fila" en tablet, evento
  // build:row-mode) se arrastra de una casilla a otra y al soltar se coloca
  // una pieza en cada casilla de la recta, de a una (respetando `pending`).
  private rowMode = false;

  private rowStart: { x: number; y: number } | null = null;

  private rowQueue: Array<{ x: number; y: number }> = [];

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

    if (this.pending || this.rowQueue.length) return;

    const grid = this.scene.isoGrid;
    if (!grid) return;

    if (this.rowMode || (pointer.event as MouseEvent | undefined)?.shiftKey) {
      const start = grid.pointerToTile(this.scene.cameras.main, pointer);
      if (start) this.rowStart = { x: start.x, y: start.y };
      return;
    }

    // Mismo criterio que el ghost (LobbyScene.update): si el cursor apunta
    // al costado de otro bloque, se pega ahí flotando a su altura.
    const sideAttach = (this.scene as any).resolveSideAttach?.(pointer) ?? null;

    const tile = sideAttach ?? grid.pointerToTile(this.scene.cameras.main, pointer);

    if (!tile) return;

    this.placeAt(tile.x, tile.y, sideAttach);
  };

  private handlePointerUp = (pointer: Phaser.Input.Pointer) => {
    const start = this.rowStart;
    this.rowStart = null;
    const grid = this.scene.isoGrid;
    if (!start || !grid || !this.buildSystem.getCurrentItem()) return;

    const end = grid.pointerToTile(this.scene.cameras.main, pointer) ?? start;
    // Recta sobre el eje que más se movió (fila o columna de la grilla).
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const alongX = Math.abs(dx) >= Math.abs(dy);
    const steps = Math.abs(alongX ? dx : dy);
    const dir = Math.sign(alongX ? dx : dy) || 1;
    this.rowQueue = Array.from({ length: steps + 1 }, (_, i) =>
      alongX ? { x: start.x + i * dir, y: start.y } : { x: start.x, y: start.y + i * dir },
    );
    this.placeNextInRow();
  };

  private placeNextInRow() {
    while (this.rowQueue.length && !this.pending && this.buildSystem.getCurrentItem()) {
      const next = this.rowQueue.shift()!;
      this.placeAt(next.x, next.y, null);
    }
    if (!this.buildSystem.getCurrentItem()) this.rowQueue = [];
  }

  private handleRowMode = (event: Event) => {
    this.rowMode = Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active);
    this.rowStart = null;
  };

  private placeAt(tx: number, ty: number, sideAttach: { elevation: number } | null) {
    const item = this.buildSystem.getCurrentItem();
    const preview = this.buildSystem.getPreview();

    if (!item || !preview) return;

    if (!this.placementValidator.canPlace(tx, ty, item, this.buildSystem.getRotation())) {
      return;
    }

    const socket = (this.scene.game as any).socket;

    const placementType = item.worldData?.placementType ?? "FLOOR";

    socket.emit("room:item:place", {
      roomId: (this.scene.game as any).roomId,
      itemId: item.id,
      x: tx,
      y: ty,
      rotation: this.buildSystem.getRotation(),
      ...(sideAttach && { elevation: sideAttach.elevation }),
      ...(item.colorable && getPlacementColor() !== null && { color: getPlacementColor() }),
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
  }

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
    // Error del servidor (sin payload): se corta la fila para no insistir.
    if (!placed) this.rowQueue = [];
    this.placeNextInRow();
  }

  initialize() {
    this.scene.input.on("pointerdown", this.handlePointerDown);
    this.scene.input.on("pointerup", this.handlePointerUp);
    window.addEventListener("build:row-mode", this.handleRowMode);
  }

  destroy() {
    this.scene.input.off("pointerdown", this.handlePointerDown);
    this.scene.input.off("pointerup", this.handlePointerUp);
    window.removeEventListener("build:row-mode", this.handleRowMode);
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
