import RoomItemsManager, { RoomItemPayload } from "./RoomItemsManager";
import { LobbySceneType } from "../types/LobbySceneType";
import { loadTextureOnce } from "../utils/phaserAssetCache";
import { audioManager } from "../audio/AudioManager";
import {
  getSpriteFrameHeight,
  getSpriteFrameIndex,
  getSpriteFrameWidth,
} from "../utils/spriteFrames";

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

  // El payload del servidor ya tiene la forma que espera
  // RoomItemsManager.addItem — antes cada handler lo desarmaba en una
  // llamada posicional de 14 argumentos y calculaba la posición en pantalla
  // por su cuenta. Ahora el anclaje lo resuelve RoomItemsManager con IsoGrid.
  private spawn(item: RoomItemPayload, imageUrl: string, sound = false) {
    void loadTextureOnce(this.scene, imageUrl).then((textureKey) => {
      this.roomItems.addItem(item, textureKey);
      this.scene.refreshPathfinding?.();
      if (sound) audioManager.play("place");
    });
  }

  private handleItemPlaced = (item: any) => {
    this.spawn(item, item.item.imageUrl, true);
  };

  private handleSurfacePainted = (data: any) => {
    data.removedIds?.forEach((id: string) => {
      this.roomItems.removeItem(id);
    });

    const item = data.surface;
    if (!item?.item?.imageUrl) return;

    this.spawn(item, item.item.imageUrl);
  };

  private handleItemRemoved = (data: any) => {
    this.roomItems.removeItem(data.roomItemId);
    this.scene.refreshPathfinding?.();
  };

  // Interacción de objeto (encender la TV, abrir una puerta): el servidor
  // manda el nuevo `state`, acá solo lo reflejamos visualmente. No cambia
  // posición ni footprint.
  private handleItemState = (data: any) => {
    const worldObject = this.roomItems.getItem(data.roomItemId);
    if (!worldObject) return;

    worldObject.state = { ...(worldObject.state ?? {}), ...(data.state ?? {}) };
    if (worldObject.item) {
      worldObject.item = { ...worldObject.item, roomItemState: worldObject.state };
    }

    this.roomItems.applyItemState(data.roomItemId);
    audioManager.play("click");
  };

  private handleItemsCleared = () => {
    this.roomItems.clear();
    this.scene.refreshPathfinding?.();
  };

  private handleItemMoved = (item: any) => {
    const worldObject = this.roomItems.getItem(item.id);

    if (!worldObject) return;

    worldObject.tileX = item.x;
    worldObject.tileY = item.y;
    worldObject.elevation = item.elevation ?? 0;
    worldObject.parentRoomItemId = item.parentRoomItemId ?? null;
    worldObject.wallSide = item.wallSide ?? null;
    worldObject.wallOffset = item.wallOffset ?? null;

    // El tile ocupado por este objeto cambió: invalidar el cache de
    // ocupación/bloqueo o quedaría desactualizado hasta que algo más lo
    // invalidara por otro lado.
    this.roomItems.invalidateOccupancy();

    // repositionItem recalcula ancla + offset de artwork + profundidad con
    // la misma fórmula que usa un item recién colocado. Antes esto era una
    // copia manual de esas tres cosas aquí mismo, que se desincronizaba.
    this.roomItems.repositionItem(item.id);
    this.roomItems.applyItemState(item.id);
    this.scene.refreshPathfinding?.();
  };

  private handleItemRotated = (item: any) => {
    const worldObject = this.roomItems.getItem(item.id);

    if (!worldObject) return;

    worldObject.rotation = item.rotation;
    worldObject.item = {
      ...item.item,
      roomItemState: item.state,
    };

    // La rotación puede cambiar el footprint (qué tiles ocupa/bloquea el
    // objeto) aunque no cambie de tile — invalidar el cache de ocupación.
    this.roomItems.invalidateOccupancy();

    const textureKey = worldObject.sprite.texture.key;
    const texture = this.scene.textures.get(textureKey);
    const frameWidth = getSpriteFrameWidth(item.item.worldData);
    const frameHeight = getSpriteFrameHeight(item.item.worldData);
    // Frame envuelto al número de caras (1/2/4), no la rotación cruda.
    const frameIndex = getSpriteFrameIndex(item.rotation, item.item.worldData);
    const frameName = `${textureKey}-room-${frameIndex}`;

    if (!texture.has(frameName)) {
      texture.add(frameName, 0, frameWidth * frameIndex, 0, frameWidth, frameHeight);
    }

    worldObject.sprite.setFrame(frameName);

    // Rotar cambia el footprint (y por tanto el ancla y el tile frontal que
    // decide la profundidad) y también el offset de artwork, que es por
    // dirección. repositionItem cubre los tres.
    this.roomItems.repositionItem(item.id);
    this.roomItems.applyItemState(item.id);
    this.scene.refreshPathfinding?.();
  };

  // "Pintar TODO el suelo" — el backend devuelve un array con la misma forma
  // {surface, removedIds} que ya usa el evento singular, uno por cada tile
  // pintado, así que reusamos handleSurfacePainted por cada uno.
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
    this.socket.on("room:item:state", this.handleItemState);
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
    this.socket.off("room:item:state", this.handleItemState);
  }
}
