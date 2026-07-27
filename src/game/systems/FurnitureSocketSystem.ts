import Phaser from "phaser";
import RoomItemsManager from "./RoomItemsManager";
import { LobbySceneType } from "../types/LobbySceneType";
import { loadTextureOnce } from "../utils/phaserAssetCache";
import { audioManager } from "../audio/AudioManager";
import { getFurnitureAnchorY } from "../utils/tileAnchor";

export default class FurnitureSocketSystem {
  private scene: LobbySceneType;

  private roomItems: RoomItemsManager;

  private socket: any;

  constructor(scene: LobbySceneType, roomItems: RoomItemsManager, socket: any) {
    this.scene = scene;
    this.roomItems = roomItems;
    this.socket = socket;
  }

  private handleItemError = (err: any) => {
    console.error("❌ ROOM ITEM ERROR");
    console.error("Mensaje:", err?.message);
    console.error("Error completo:", JSON.stringify(err, null, 2));
  };

  private handleItemPlaced = (item: any) => {
    const imageUrl = item.item.imageUrl;

    const spawnItem = () => {
      const worldPos = this.scene.groundLayer.tileToWorldXY(item.x, item.y);

      if (!worldPos) return;

      this.roomItems.addItem(
        item.id,
        imageUrl,

        worldPos.x + this.scene.map.tileWidth / 2,
        getFurnitureAnchorY(worldPos.y, this.scene.map.tileHeight),

        item.x,
        item.y,

        item.rotation,

        item.item.worldData.engineData?.frameWidth ?? item.item.worldData.width / 4,
        item.item.worldData.engineData?.frameHeight ?? item.item.worldData.height,

        item.roomId,
        item.userId,
        {
          ...item.item,
          roomItemState: item.state,
        },

        item.elevation ?? 0,
        item.parentRoomItemId ?? null,
        item.wallSide ?? null,
        item.wallOffset ?? null,
      );
      this.scene.refreshPathfinding?.();
      audioManager.play("place");
    };

    void loadTextureOnce(this.scene, imageUrl).then(spawnItem);
  };

  private handleSurfacePainted = (data: any) => {
    data.removedIds?.forEach((id: string) => {
      this.roomItems.removeItem(id);
    });

    const item = data.surface;
    if (!item?.item?.imageUrl) return;

    const imageUrl = item.item.imageUrl;

    const spawnSurface = () => {
      const worldPos = this.scene.groundLayer.tileToWorldXY(item.x, item.y);

      if (!worldPos) return;

      this.roomItems.addItem(
        item.id,
        imageUrl,

        worldPos.x + this.scene.map.tileWidth / 2,
        getFurnitureAnchorY(worldPos.y, this.scene.map.tileHeight),

        item.x,
        item.y,

        item.rotation,

        item.item.worldData.engineData?.frameWidth ?? item.item.worldData.width / 4,
        item.item.worldData.engineData?.frameHeight ?? item.item.worldData.height,

        item.roomId,
        item.userId,
        {
          ...item.item,
          roomItemState: item.state,
        },

        item.elevation ?? 0,
        item.parentRoomItemId ?? null,
        item.wallSide ?? null,
        item.wallOffset ?? null,
      );

      this.scene.refreshPathfinding?.();
    };

    void loadTextureOnce(this.scene, imageUrl).then(spawnSurface);
  };

  private handleItemRemoved = (data: any) => {
    this.roomItems.removeItem(data.roomItemId);
    this.scene.refreshPathfinding?.();
  };

  private handleItemsCleared = () => {
    this.roomItems.clear();
    this.scene.refreshPathfinding?.();
  };

  private handleItemMoved = (item: any) => {
    const worldObject = this.roomItems.getItem(item.id);

    if (!worldObject) return;

    const worldPos = this.scene.groundLayer.tileToWorldXY(item.x, item.y);
    if (!worldPos) return;

    worldObject.tileX = item.x;
    worldObject.tileY = item.y;
    worldObject.elevation = item.elevation ?? 0;
    worldObject.parentRoomItemId = item.parentRoomItemId ?? null;
    worldObject.wallSide = item.wallSide ?? null;
    worldObject.wallOffset = item.wallOffset ?? null;
    worldObject.sprite.setPosition(
      worldPos.x + this.scene.map.tileWidth / 2,
      getFurnitureAnchorY(worldPos.y, this.scene.map.tileHeight) -
        worldObject.elevation * 16,
    );
    worldObject.sprite.setDepth(
      item.y * 1000 + item.x + worldObject.elevation * 100,
    );
    this.scene.refreshPathfinding?.();
  };

  private handleItemRotated = (item: any) => {
    console.log("🔄 Rotado", item.rotation);
    const worldObject = this.roomItems.getItem(item.id);

    if (!worldObject) return;

    worldObject.rotation = item.rotation;
    worldObject.item = {
      ...item.item,
      roomItemState: item.state,
    };

    const textureKey = worldObject.sprite.texture.key;
    const texture = this.scene.textures.get(textureKey);
    const frameWidth = item.item.worldData.engineData?.frameWidth ?? item.item.worldData.width / 4;
    const frameHeight = item.item.worldData.engineData?.frameHeight ?? item.item.worldData.height;
    const frameName = `${textureKey}-room-${item.rotation}`;

    if (!texture.has(frameName)) {
      texture.add(
        frameName,
        0,
        frameWidth * item.rotation,
        0,
        frameWidth,
        frameHeight,
      );
    }

    worldObject.sprite.setFrame(frameName);
    this.scene.refreshPathfinding?.();
  };

  // "Pintar TODO el suelo" — el backend devuelve un array con la misma forma
  // {surface, removedIds} que ya usa el evento singular, uno por cada tile
  // pintado, así que reusamos handleSurfacePainted por cada uno en vez de
  // duplicar la lógica de spawn. Antes de esto, la sala sólo se veía pintada
  // tras salir y volver a entrar (el único listener de este evento era el
  // que agenda la captura del thumbnail, en LobbyScene).
  private handleAllSurfacesPainted = (data: any) => {
    const surfaces = data?.surfaces ?? [];
    surfaces.forEach((surfaceResult: any) => this.handleSurfacePainted(surfaceResult));
  };

  initialize() {
    this.socket.on("room:item:error", this.handleItemError);
    this.socket.on("room:item:placed", this.handleItemPlaced);
    this.socket.on("room:surface:painted", this.handleSurfacePainted);
    this.socket.on("room:surfaces:painted-all", this.handleAllSurfacesPainted);
    this.socket.on("room:item:removed", this.handleItemRemoved);
    this.socket.on("room:items:cleared", this.handleItemsCleared);
    this.socket.on("room:item:moved", this.handleItemMoved);
    this.socket.on("room:item:rotated", this.handleItemRotated);
  }

  destroy() {
    this.socket.off("room:item:error", this.handleItemError);
    this.socket.off("room:item:placed", this.handleItemPlaced);
    this.socket.off("room:surface:painted", this.handleSurfacePainted);
    this.socket.off("room:surfaces:painted-all", this.handleAllSurfacesPainted);
    this.socket.off("room:item:removed", this.handleItemRemoved);
    this.socket.off("room:items:cleared", this.handleItemsCleared);
    this.socket.off("room:item:moved", this.handleItemMoved);
    this.socket.off("room:item:rotated", this.handleItemRotated);
  }
}
