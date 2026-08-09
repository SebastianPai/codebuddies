import Phaser from "phaser";
import { Player } from "../types/player";
import ModularPlayer from "../players/ModularPlayer";
import PlayerHUD from "../hud/PlayerHUD";
import { AvatarSlot } from "../types/avatar";
import EasyStar from "easystarjs";

import BuildSystem from "../systems/BuildSystem";
import RoomItemsManager from "../systems/RoomItemsManager";
import PlacementValidator from "../systems/PlacementValidator";
import { LobbySceneType } from "../types/LobbySceneType";
import FurnitureSocketSystem from "../systems/FurnitureSocketSystem";
import FurniturePlacementSystem from "../systems/FurniturePlacementSystem";
import { OtherPlayer } from "../types/OtherPlayer";
import PlayerSocketSystem from "../systems/PlayerSocketSystem";
import BackgroundManager from "../systems/BackgroundManager";
import {
  getDirectionalFootprint,
  getFootprintSize,
  toWorldTiles,
} from "../systems/IsoFootprint";
import { loadTextureOnce } from "../utils/phaserAssetCache";
import {
  getFurnitureAnchorY,
  PLAYER_Y_OFFSET,
  TILE_VISUAL_Y_OFFSET,
} from "../utils/tileAnchor";

export default class LobbyScene extends Phaser.Scene implements LobbySceneType {
  player!: ModularPlayer;
  otherPlayers!: Phaser.GameObjects.Group;
  hud!: PlayerHUD;
  minimap!: Phaser.Cameras.Scene2D.Camera;

  private loadedTextures: Set<string> = new Set();
  private pcZone!: Phaser.GameObjects.Zone;

  map!: Phaser.Tilemaps.Tilemap;
  groundLayer!: Phaser.Tilemaps.TilemapLayer;

  private roomItems!: RoomItemsManager;
  private placementValidator!: PlacementValidator;

  // Pathfinding
  private easystar!: EasyStar.js;
  private currentPath: { x: number; y: number }[] = [];
  private speed = 180;
  private arrivalThreshold = 5;

  // Highlight (selector de tiles)
  private hoverHighlight!: Phaser.GameObjects.Polygon;
  private lastHoverTile = { x: -1, y: -1 };
  private buildSystem!: BuildSystem;
  private furnitureSockets!: FurnitureSocketSystem;
  private furniturePlacement!: FurniturePlacementSystem;
  private playerSockets!: PlayerSocketSystem;
  private backgroundManager!: BackgroundManager;
  private currentLayoutComposition: {
    layoutOffset: { x: number; y: number };
    cameraAnchor: { x: number; y: number } | null;
  } = {
    layoutOffset: { x: 0, y: 0 },
    cameraAnchor: null,
  };

  private mapLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  private selectedFloorTileIndex: number | null = null;
  private selectedSurfaceTexture: {
    item: any;
    width: number;
    height: number;
  } | null = null;
  private movingRoomItem: any = null;
  private thumbnailTimer?: ReturnType<typeof setTimeout>;
  private thumbnailInFlight = false;
  private canUpdateRoomThumbnail = false;
  private lastPaintedTileKey: string | null = null;

  constructor() {
    super("LobbyScene");
  }

  preload() {
    this.load.setCORS("anonymous");
    this.load.image(
      "tiles",
      "https://codebuddies.sfo3.digitaloceanspaces.com/maps/rooms/tiles3.png",
    );
  }

  create() {
    const tex = this.textures.get("tiles");
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

    const socket = (this.game as any).socket;
    const user = (this.game as any).user;
    this.backgroundManager = new BackgroundManager(this);

    socket.on("room:joined", (data: any) => {
      console.log(data.room.background);

      console.log("🧹 LIMPIANDO SALA ANTERIOR");

      this.destroyCurrentMap();

      this.otherPlayers?.clear(true, true);

      this.roomItems?.clear();

      (this.game as any).roomId = data.room.id;
      this.canUpdateRoomThumbnail = data.room.ownerId === user?.userId;

      console.log("🏠 ROOM CARGADA", (this.game as any).roomId);
      const layout = data.room.layout;
      if (!layout) return console.error("❌ Sala sin layout");

      const blob = new Blob([JSON.stringify(layout.layoutJson)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      if (this.cache.tilemap.exists("dynamic-map")) {
        console.log("🗑️ BORRANDO TILEMAP CACHE");
        this.cache.tilemap.remove("dynamic-map");
      }

      this.load.tilemapTiledJSON("dynamic-map", url);

      this.load.once("complete", () => {
        this.currentLayoutComposition = this.getLayoutComposition(layout.layoutJson);
        this.buildMap();
        this.backgroundManager.setBackground(data.room.background, {
          layoutAnchor: this.getCompositionCenter(),
        });
        console.log(
          "MAP SIZE",
          this.map.width,
          this.map.height,
          this.map.layers.length,
        );
        this.createWorld(user, socket, data.players, data.items);
        this.scheduleRoomThumbnailCapture(2200);
      });

      this.load.start();
    });

    socket.on("room:backgroundChanged", (data: any) => {
      this.backgroundManager.setBackground(data.background, {
        layoutAnchor: this.getCompositionCenter(),
      });
      this.scheduleRoomThumbnailCapture(1400);
    });

    [
      "room:item:placed",
      "room:item:moved",
      "room:item:rotated",
      "room:item:removed",
      "room:items:cleared",
      "room:surface:painted",
      "room:surfaces:painted-all",
    ].forEach((eventName) => {
      socket.on(eventName, () => this.scheduleRoomThumbnailCapture());
    });

    // Puente socket -> UI React para la barra de progreso de "Pintar TODO el
    // suelo" (BuildModePanel/Game.tsx no tienen acceso directo al socket acá,
    // solo se comunican con Phaser vía window CustomEvent).
    socket.on(
      "room:surface:paint-all:progress",
      (data: { done: number; total: number }) => {
        window.dispatchEvent(
          new CustomEvent("build:paint-all:progress", { detail: data }),
        );
      },
    );

    socket.on("room:surfaces:painted-all", () => {
      window.dispatchEvent(new CustomEvent("build:paint-all:done"));
    });

    socket.on(
      "room:surface:paint-all:error",
      (data: { message?: string }) => {
        window.dispatchEvent(
          new CustomEvent("build:paint-all:error", { detail: data }),
        );
      },
    );

    const initialRoomId = (this.game as any).roomId;

    if (initialRoomId) {
      socket.emit("joinRoom", {
        roomId: initialRoomId,
      });
    }

    // Listeners globales de input/ventana: se registran UNA sola vez aquí (no en
    // createWorld(), que se re-ejecuta en cada cambio de sala) para no acumularse.
    // Todos leen this.buildSystem/this.player/etc. en el momento en que se disparan,
    // no al registrarse, así que es seguro conectarlos antes de que exista la sala.
    this.setupGlobalInputListeners();
  }

  private setupGlobalInputListeners() {
    this.input.keyboard!.on("keydown-E", () => {
      if (
        Phaser.Math.Distance.Between(this.player.x, this.player.y, 300, 300) <
        100
      ) {
        (window as any).openPC?.();
      }
    });

    window.addEventListener("build:item:selected", (event: any) => {
      this.buildSystem.start(event.detail);
      this.selectedFloorTileIndex = null;
      this.selectedSurfaceTexture = null;
    });

    window.addEventListener("build:item:cancel", () => {
      this.buildSystem.stop();
      this.selectedFloorTileIndex = null;
      this.selectedSurfaceTexture = null;
      this.lastPaintedTileKey = null;
    });

    window.addEventListener("build:floor-tile:selected", (event: any) => {
      const tileIndex = Number(event.detail?.tileIndex);

      if (!Number.isFinite(tileIndex)) return;

      this.buildSystem.stop();
      this.selectedSurfaceTexture = null;
      this.selectedFloorTileIndex = tileIndex;
    });

    window.addEventListener("build:surface:selected", (event: any) => {
      const item = event.detail?.item;

      if (!item?.id) return;

      this.buildSystem.stop();
      this.selectedFloorTileIndex = null;
      this.selectedSurfaceTexture = {
        item,
        width: Math.max(1, Number(event.detail?.width) || 1),
        height: Math.max(1, Number(event.detail?.height) || 1),
      };
      // El indicador "Pintando... ESC para cancelar" ahora vive en
      // BuildModePanel.tsx (React), no acá — el Text de Phaser que había
      // antes no tenía setScrollFactor(0), así que se desalineaba en
      // pantalla al moverse la cámara, y visualmente no encajaba con el
      // resto de la UI.
    });

    window.addEventListener("build:surface:cancel", () => {
      this.buildSystem.stop();
      this.selectedFloorTileIndex = null;
      this.selectedSurfaceTexture = null;
      this.lastPaintedTileKey = null;
    });

    window.addEventListener("build:mode:set", (event: any) => {
      this.setBuildMode(Boolean(event.detail?.active));
    });

    window.addEventListener("build:paint-all-floor", () => {
      if (!this.selectedSurfaceTexture) {
        return;
      }

      const socket = (this.game as any).socket;

      // total: 0 marca el arranque (todavía no sabemos cuántos tiles son,
      // eso lo confirma el primer "room:surface:paint-all:progress" real que
      // manda el server) para que la UI muestre el estado "Pintando..." de
      // inmediato en vez de esperar la primera respuesta del socket.
      window.dispatchEvent(
        new CustomEvent("build:paint-all:progress", {
          detail: { done: 0, total: 0 },
        }),
      );

      socket.emit("room:surface:paint-all", {
        roomId: (this.game as any).roomId,
        itemId: this.selectedSurfaceTexture.item.id,
        width: this.selectedSurfaceTexture.width,
        height: this.selectedSurfaceTexture.height,
      });

      console.log("🎨 Pintando todo el suelo");

      this.selectedSurfaceTexture = null;
    });

    window.addEventListener("build:item:move", (event: any) => {
      this.buildSystem.stop();
      this.selectedFloorTileIndex = null;
      this.selectedSurfaceTexture = null;
      this.movingRoomItem = event.detail;
    });

    // 🔥 Zoom con rueda del mouse
    this.input.on(
      "wheel",
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: any,
        _deltaX: number,
        deltaY: number,
      ) => {
        const zoomLevels = [1, 2, 3];
        let currentIndex = zoomLevels.indexOf(this.cameras.main.zoom);

        if (deltaY > 0) currentIndex--;
        else currentIndex++;

        currentIndex = Phaser.Math.Clamp(
          currentIndex,
          0,
          zoomLevels.length - 1,
        );

        this.cameras.main.setZoom(zoomLevels[currentIndex]);
      },
    );

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) =>
      this.updateHoverHighlight(pointer),
    );
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      if (this.paintSelectedSurfaceTexture(pointer)) return;
      this.paintSelectedFloorTile(pointer);
    });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) =>
      this.handleClickToMove(pointer),
    );
    this.input.on("pointerup", () => {
      this.lastPaintedTileKey = null;
    });

    this.input.keyboard?.on("keydown-R", () => {
      this.buildSystem.rotate();
    });

    // ❌ ESC para cancelar pintura
    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.selectedSurfaceTexture || this.selectedFloorTileIndex !== null) {
        window.dispatchEvent(new CustomEvent("build:surface:cancel"));
      }
    });
  }

  private scheduleRoomThumbnailCapture(delay = 1200) {
    if (!this.canUpdateRoomThumbnail) return;

    if (this.thumbnailTimer) {
      clearTimeout(this.thumbnailTimer);
    }

    this.thumbnailTimer = setTimeout(() => {
      void this.captureRoomThumbnail();
    }, delay);
  }

  private async captureRoomThumbnail() {
    if (this.thumbnailInFlight || !this.canUpdateRoomThumbnail) return;

    const socket = (this.game as any).socket;
    const roomId = (this.game as any).roomId;

    if (!socket || !roomId || !this.game?.renderer) return;

    this.thumbnailInFlight = true;

    try {
      const snapshot = await new Promise<HTMLImageElement | HTMLCanvasElement>(
        (resolve, reject) => {
          try {
            (this.game.renderer as any).snapshot(
              (image: HTMLImageElement | HTMLCanvasElement) => resolve(image),
              "image/jpeg",
              0.72,
            );
          } catch (error) {
            reject(error);
          }
        },
      );

      const blob = await this.createRoomThumbnailBlob(snapshot);
      const formData = new FormData();
      const filename = `room-${roomId}-${Date.now()}.jpg`;

      formData.append("file", new File([blob], filename, { type: "image/jpeg" }));
      formData.append("folder", "room-thumbnails");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/uploads`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("No se pudo subir la captura");
      }

      const result = (await response.json()) as { url?: string };

      if (result.url) {
        socket.emit("room:thumbnail:update", {
          roomId,
          thumbnailUrl: result.url,
        });
      }
    } catch (error) {
      console.warn("No se pudo capturar la sala", error);
    } finally {
      this.thumbnailInFlight = false;
    }
  }

  private async createRoomThumbnailBlob(
    snapshot: HTMLImageElement | HTMLCanvasElement,
  ) {
    const source =
      snapshot instanceof HTMLCanvasElement
        ? snapshot.toDataURL("image/jpeg", 0.72)
        : snapshot.src;

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = source;
    });

    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / image.width);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo crear canvas de miniatura");
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("No se pudo generar la miniatura"));
        },
        "image/jpeg",
        0.72,
      );
    });
  }

  private destroyCurrentMap() {
    if (this.thumbnailTimer) {
      clearTimeout(this.thumbnailTimer);
      this.thumbnailTimer = undefined;
    }

    console.log("MAP LAYERS:", this.mapLayers.length);

    // Sistemas de la sala anterior: se suscriben a socket/input propios y deben
    // liberarlos antes de que createWorld() cree instancias nuevas, o se acumulan
    // (acciones duplicadas en cada cambio de sala).
    this.furnitureSockets?.destroy();
    this.playerSockets?.destroy();
    this.furniturePlacement?.destroy();

    if (this.minimap) {
      this.cameras.remove(this.minimap);
      this.minimap = undefined as unknown as Phaser.Cameras.Scene2D.Camera;
    }

    this.children.removeAll(true);
    this.backgroundManager?.clear();

    this.mapLayers.forEach((layer) => {
      layer.destroy();
    });

    this.mapLayers = [];

    if (this.map) {
      this.map.destroy();
    }

    // Crítico: destruir los objetos no basta. Si no limpiamos estas
    // referencias, this.groundLayer/this.map siguen apuntando a instancias ya
    // destruidas (truthy pero rotas) mientras se carga el tilemap nuevo de
    // forma asíncrona. Los guards `!this.groundLayer` repartidos por el
    // archivo (update, updateSceneDepths, setupPathfinding, etc.) confían en
    // que la propiedad sea undefined durante la transición — si no la
    // reseteamos acá, esos guards nunca disparan y se termina llamando a
    // métodos de Phaser (worldToTileXY, etc.) sobre una capa destruida, cuyo
    // `this.tilemap` interno ya es undefined → crash en pleno cambio de sala.
    this.groundLayer = undefined as unknown as Phaser.Tilemaps.TilemapLayer;
    this.map = undefined as unknown as Phaser.Tilemaps.Tilemap;
  }

  private buildMap() {
    this.map = this.make.tilemap({ key: "dynamic-map" });

    const tileset = this.map.addTilesetImage("tiles3", "tiles");
    if (!tileset) return console.error("❌ Tileset no encontrado");

    const compositionCenter = this.getCompositionCenter();
    const offsetX =
      compositionCenter.x -
      this.map.widthInPixels / 2 +
      this.currentLayoutComposition.layoutOffset.x;
    const offsetY =
      compositionCenter.y -
      this.map.heightInPixels / 2 +
      this.currentLayoutComposition.layoutOffset.y;

    const createdLayers: Phaser.Tilemaps.TilemapLayer[] = [];

    this.map.layers.forEach((layerData, index) => {
      const layer = this.map.createLayer(
        layerData.name,
        tileset,
        offsetX,
        offsetY,
      );

      if (!layer) return;

      this.mapLayers.push(layer);
      createdLayers.push(layer);

      layer.setDepth(10 + index);
    });

    this.groundLayer = this.detectGroundLayer(createdLayers);
    this.groundLayer?.setDepth(0);
  }

  private getLayoutComposition(layoutJson: any) {
    const config = layoutJson?.__codebuddies ?? {};
    const layoutAnchor = config.layoutAnchor ?? {};
    const cameraAnchor = config.cameraAnchor ?? null;

    return {
      layoutOffset: {
        x: Number(layoutAnchor.x ?? 0),
        y: Number(layoutAnchor.y ?? 0),
      },
      cameraAnchor: cameraAnchor
        ? {
            x: Number(cameraAnchor.x ?? 0),
            y: Number(cameraAnchor.y ?? 0),
          }
        : null,
    };
  }

  private getCompositionCenter() {
    return {
      x: this.scale.width / 2,
      y: this.scale.height / 2,
    };
  }

  private detectGroundLayer(layers: Phaser.Tilemaps.TilemapLayer[]) {
    // Convención: la primera capa Tiled ("Capa de patrones 1") es el suelo.
    // Si tiene algún tile, se usa directo — determinista, sin adivinar.
    const firstLayer = layers[0];
    if (firstLayer) {
      const firstLayerHasTiles = (firstLayer.layer.data || []).some((row) =>
        row.some((tile) => tile?.index !== -1),
      );
      if (firstLayerHasTiles) return firstLayer;
    }

    // Mapas más viejos donde la primera capa no es el suelo (o está vacía):
    // se cae al heurístico anterior (la capa con más tiles gana) para no
    // romper salas ya creadas.
    const scoredLayers = layers.map((layer, index) => {
      const data = layer.layer.data || [];
      const tileCount = data.reduce((total, row) => {
        return total + row.filter((tile) => tile?.index !== -1).length;
      }, 0);

      return { layer, index, tileCount };
    });

    scoredLayers.sort((a, b) => {
      if (b.tileCount !== a.tileCount) return b.tileCount - a.tileCount;
      return a.index - b.index;
    });

    return scoredLayers[0]?.layer || layers[0];
  }

  private setBuildMode(active: boolean) {
    this.minimap?.setVisible(!active);

    const hudContainer = (this.hud as any)?.container;
    if (hudContainer?.setVisible) {
      hudContainer.setVisible(!active);
    }
  }

  private createWorld(user: any, socket: any, players: Player[], items: any[]) {
    this.pcZone = this.add.zone(300, 300, 100, 100);
    this.physics.add.existing(this.pcZone);

    this.cameras.main.roundPixels = true;

    this.player = new ModularPlayer(this, 250, 250, []);

    if (this.currentLayoutComposition.cameraAnchor) {
      const compositionCenter = this.getCompositionCenter();
      this.cameras.main.centerOn(
        compositionCenter.x + this.currentLayoutComposition.cameraAnchor.x,
        compositionCenter.y + this.currentLayoutComposition.cameraAnchor.y,
      );
    }

    this.cameras.main.startFollow(this.player, false);
    this.cameras.main.roundPixels = true;
    this.cameras.main.setZoom(1);

    this.roomItems = new RoomItemsManager(this);

    this.furnitureSockets = new FurnitureSocketSystem(
      this,
      this.roomItems,
      socket,
    );

    this.furnitureSockets.initialize();

    console.log("🔥 PLAYER SOCKET INIT");

    this.playerSockets = new PlayerSocketSystem(this, socket);

    this.playerSockets.initialize();

    const spawnRoomItem = (item: any, textureKey: string) => {
      const worldPos = this.groundLayer.tileToWorldXY(item.x, item.y);

      if (!worldPos) return;

      this.roomItems.addItem(
        item.id,
        textureKey,

        worldPos.x + this.map.tileWidth / 2,
        getFurnitureAnchorY(worldPos.y, this.map.tileHeight),

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
      this.refreshPathfinding();
    };

    items.forEach((item) => {
      void loadTextureOnce(this, item.item.imageUrl).then((textureKey) =>
        spawnRoomItem(item, textureKey),
      );
    });

    this.placementValidator = new PlacementValidator();
    this.placementValidator.configure(
      this.map,
      this.groundLayer,
      this.roomItems,
    );

    this.buildSystem = new BuildSystem(this);

    this.furniturePlacement = new FurniturePlacementSystem(
      this,
      this.buildSystem,
      this.placementValidator,
    );

    this.furniturePlacement.initialize();

    this.hud = new PlayerHUD({
      scene: this,
      playerSprite: this.player,
      username: user.username,
      level: user.level || 1,
    });

    this.otherPlayers = this.add.group();

    // x=350 deja el minimapa a la derecha del LeftSidebar (320px de ancho +
    // margen); en (10,10) quedaba tapado por completo detrás del sidebar,
    // que es un panel DOM permanente por encima del canvas.
    this.minimap = this.cameras
      .add(350, 10, 180, 180)
      .setZoom(0.15)
      .setName("minimap")
      .setBackgroundColor(0x002244);
    this.minimap.startFollow(this.player);
    this.minimap.ignore(this.hud.getDisplayObjects());

    this.hoverHighlight = this.add
      .polygon(0, 0, [32, 0, 64, 16, 32, 32, 0, 16], 0xffff44, 0.45)
      .setDepth(150)
      .setStrokeStyle(2.5, 0xffffff, 0.7)
      .setVisible(false);

    this.setupPathfinding();

    players.forEach((playerData) => {
      if (playerData.id === socket.id) {
        this.loadAvatarTextures(playerData.avatar.slots, () => {
          this.player.updateAvatar(
            playerData.avatar.slots,
            playerData.avatar.skinColor,
          );
          this.player.playIdle();
        });
      } else {
        this.addOtherPlayer(playerData);
      }
    });
  }

  private setupPathfinding() {
    if (!this.groundLayer) return console.error("❌ No groundLayer");

    this.easystar = new EasyStar.js() as any;

    // Se calcula una sola vez fuera del loop de tiles: getBlockingTiles() recorre
    // todos los muebles de la sala, así que llamarlo por-tile era O(ancho*alto*muebles)
    // en vez de O(ancho*alto + muebles) (mismo patrón ya usado en PlacementValidator).
    const blockingTiles = this.roomItems?.getBlockingTiles();

    const grid: number[][] = [];
    for (let y = 0; y < this.map.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.groundLayer.getTileAt(x, y);
        const blocked = blockingTiles?.has(`${x},${y}`) ?? false;
        row.push(tile && tile.index !== -1 && !blocked ? 0 : 1);
      }
      grid.push(row);
    }

    this.easystar.setGrid(grid);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();
    // Sin disableCornerCutting(): en una sala isométrica con forma de rombo,
    // los tiles de la punta (arriba/abajo/izquierda/derecha) suelen tener
    // sus dos vecinos ortogonales fuera de la sala (bloqueados) y sólo son
    // alcanzables en diagonal. Con corner-cutting deshabilitado, EasyStar
    // exige que AMBOS vecinos ortogonales sean caminables para permitir esa
    // diagonal — imposible en esas puntas — dejando al jugador trabado ahí.
  }

  private isWalkable(tx: number, ty: number): boolean {
    if (!this.groundLayer) return false;
    const tile = this.groundLayer.getTileAt(tx, ty);
    return !!(tile && tile.index !== -1 && !this.isTileBlockedByObject(tx, ty));
  }

  private isTileBlockedByObject(tx: number, ty: number): boolean {
    return this.roomItems?.getBlockingTiles().has(`${tx},${ty}`) ?? false;
  }

  refreshPathfinding() {
    if (!this.groundLayer || !this.map) return;
    this.currentPath = [];
    this.setupPathfinding();
  }

  // ====================== HIGHLIGHT CORREGIDO (más preciso) ======================
  private updateHoverHighlight(pointer: Phaser.Input.Pointer) {
    if (!this.groundLayer) return;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // Misma conversión (sin offset) que FurniturePlacementSystem.ts, la
    // única que siempre coincidió con el tile que el jugador ve bajo el
    // puntero. Los offsets "afinados" que había antes acá compensaban a
    // ojo el bug real (ver handleClickToMove/paintSelected*), no lo
    // arreglaban — desalineaban el highlight en vez de corregir el click.
    const tileXY = this.groundLayer.worldToTileXY(
      worldPoint.x,
      worldPoint.y,
      false,
    );

    if (!tileXY) {
      this.hoverHighlight.setVisible(false);
      return;
    }

    const tx = Math.floor(tileXY.x);
    const ty = Math.floor(tileXY.y);

    if (tx === this.lastHoverTile.x && ty === this.lastHoverTile.y) return;
    this.lastHoverTile = { x: tx, y: ty };

    if (
      !this.isWalkable(tx, ty) ||
      tx < 0 ||
      ty < 0 ||
      tx >= this.map.width ||
      ty >= this.map.height
    ) {
      this.hoverHighlight.setVisible(false);
      return;
    }

    const worldPos = this.groundLayer.tileToWorldXY(tx, ty);

    if (worldPos) {
      this.hoverHighlight.setPosition(
        worldPos.x + this.map.tileWidth / 2,
        // Mismo TILE_VISUAL_Y_OFFSET que getFurnitureAnchorY (antes hardcodeado
        // como +11 acá, se desincronizaba cada vez que se recalibraba el de
        // muebles/texturas — ver tileAnchor.ts).
        worldPos.y + this.map.tileHeight + TILE_VISUAL_Y_OFFSET,
      );
      this.hoverHighlight.setVisible(true);
    }
  }

  private handleClickToMove(pointer: Phaser.Input.Pointer) {
    if (!this.groundLayer) return;
    if (this.buildSystem?.getCurrentItem()) return;
    if (this.moveSelectedRoomItem(pointer)) return;
    if (this.paintSelectedSurfaceTexture(pointer)) return;
    if (this.paintSelectedFloorTile(pointer)) return;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // Misma conversión que FurniturePlacementSystem.ts (sin offset en Y) —
    // antes este destino se calculaba CON offset mientras el tile de origen
    // (playerTile, dos líneas abajo) se calculaba SIN offset, dos criterios
    // distintos en la misma función. Eso es lo que hacía que el pathfinding
    // apuntara a un tile distinto al que se ve bajo el cursor.
    const tileXY = this.groundLayer.worldToTileXY(
      worldPoint.x,
      worldPoint.y,
      false,
    );

    if (!tileXY) return;

    const targetX = Math.floor(tileXY.x);
    const targetY = Math.floor(tileXY.y);

    if (!this.isWalkable(targetX, targetY)) return;

    // Restar PLAYER_Y_OFFSET acá también (mismo motivo que en
    // updateSceneDepths): sin esto, el tile de ORIGEN del pathfinding podía
    // calcularse una fila distinta a la real, y EasyStar terminaba armando
    // un camino que parecía cruzar derecho por un mueble bloqueado.
    const playerTile = this.groundLayer.worldToTileXY(
      this.player.x,
      this.player.y - PLAYER_Y_OFFSET,
      false,
    );
    if (!playerTile) return;

    const fromX = Math.floor(playerTile.x);
    const fromY = Math.floor(playerTile.y);

    if (fromX === targetX && fromY === targetY) return;

    this.easystar.findPath(fromX, fromY, targetX, targetY, (path) => {
      // 🐛 DEBUG TEMPORAL — borrar después de diagnosticar el bug de
      // colisión.
      console.log("🗺️ PATH CALCULADO", { fromX, fromY, targetX, targetY, path });

      if (path && path.length > 1) {
        this.currentPath = path.slice(1);
      }
    });
  }

  private moveSelectedRoomItem(pointer: Phaser.Input.Pointer) {
    if (!this.movingRoomItem || !this.groundLayer) return false;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileXY = this.groundLayer.worldToTileXY(
      worldPoint.x,
      worldPoint.y,
      false,
    );

    if (!tileXY) return true;

    const tx = Math.floor(tileXY.x);
    const ty = Math.floor(tileXY.y);

    if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) {
      return true;
    }

    const socket = (this.game as any).socket;

    socket.emit("room:item:move", {
      roomItemId: this.movingRoomItem.roomItemId,
      x: tx,
      y: ty,
      rotation: this.movingRoomItem.rotation,
    });

    this.movingRoomItem = null;

    return true;
  }

  private paintSelectedSurfaceTexture(pointer: Phaser.Input.Pointer) {
    if (!this.selectedSurfaceTexture || !this.groundLayer) return false;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileXY = this.groundLayer.worldToTileXY(
      worldPoint.x,
      worldPoint.y,
      false,
    );

    if (!tileXY) return true;

    const tx = Math.floor(tileXY.x);
    const ty = Math.floor(tileXY.y);

    if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) {
      return true;
    }

    const socket = (this.game as any).socket;
    const item = this.selectedSurfaceTexture.item;
    const kind = item.worldData?.kind;

    if (kind === "WALL") {
      window.dispatchEvent(
        new CustomEvent("game:dialog", {
          detail: {
            id: `paint-wall-${Date.now()}`,
            type: "alert",
            title: "Textura no valida",
            message:
              "Las texturas de pared no se pueden pintar sobre el suelo. Usa una textura de tipo suelo.",
            confirmLabel: "Entendido",
            tone: "danger",
          },
        }),
      );
      return true;
    }

    // ❌ Validación: No permitir pintar paredes en el suelo
    if (kind === "WALL") {
      console.warn(
        "❌ Las texturas de pared no se pueden pintar en el suelo. Solo usa texturas de SUELO para el piso.",
      );
      return true;
    }

    const paintKey = `${tx}:${ty}:${item.id}:${this.selectedSurfaceTexture.width}:${this.selectedSurfaceTexture.height}`;
    if (this.lastPaintedTileKey === paintKey) return true;
    this.lastPaintedTileKey = paintKey;

    socket.emit("room:surface:paint", {
      roomId: (this.game as any).roomId,
      itemId: item.id,
      x: tx,
      y: ty,
      width: this.selectedSurfaceTexture.width,
      height: this.selectedSurfaceTexture.height,
      ...(kind === "WALL" && {
        wallSide: this.inferWallSide(tx, ty),
      }),
    });

    return true;
  }

  private inferWallSide(tx: number, ty: number) {
    if (ty <= 0) return "NORTH";
    if (tx >= this.map.width - 1) return "EAST";
    if (ty >= this.map.height - 1) return "SOUTH";
    if (tx <= 0) return "WEST";

    return "NORTH";
  }

  private paintSelectedFloorTile(pointer: Phaser.Input.Pointer) {
    if (this.selectedFloorTileIndex === null || !this.groundLayer) return false;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileXY = this.groundLayer.worldToTileXY(
      worldPoint.x,
      worldPoint.y,
      false,
    );

    if (!tileXY) return true;

    const tx = Math.floor(tileXY.x);
    const ty = Math.floor(tileXY.y);

    if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) {
      return true;
    }

    const paintKey = `${tx}:${ty}:${this.selectedFloorTileIndex}`;
    if (this.lastPaintedTileKey === paintKey) return true;
    this.lastPaintedTileKey = paintKey;

    this.groundLayer.putTileAt(this.selectedFloorTileIndex, tx, ty);
    this.refreshPathfinding();

    return true;
  }

  update() {
    this.buildSystem?.update(this.input.activePointer);
    this.updateBuildPreviewTint(this.input.activePointer);
    if (!this.player || !this.groundLayer) return;

    const socket = (this.game as any).socket;
    this.easystar.calculate();
    this.updateSceneDepths();

    if (this.currentPath.length === 0) {
      if (this.player.isMoving) {
        this.player.playIdle();
        socket.emit("playerMove", {
          x: this.player.x,
          y: this.player.y,
          direction: this.player.currentDirection,
          isMoving: false,
        });
      }
      return;
    }

    const next = this.currentPath[0];
    const worldPos = this.groundLayer.tileToWorldXY(next.x, next.y);
    if (!worldPos) {
      this.currentPath.shift();
      return;
    }

    const targetX = worldPos.x + this.map.tileWidth / 2;
    const targetY = worldPos.y + this.map.tileHeight / 2 + PLAYER_Y_OFFSET;

    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    const dist = Math.hypot(dx, dy);

    if (dist < this.arrivalThreshold) {
      this.currentPath.shift();
      this.player.x = targetX;
      this.player.y = targetY;

      if (this.currentPath.length === 0) {
        this.player.playIdle();
        socket.emit("playerMove", {
          x: this.player.x,
          y: this.player.y,
          direction: this.player.currentDirection,
          isMoving: false,
        });
      }
      return;
    }

    const delta = this.game.loop.delta / 1000;
    this.player.x += (dx / dist) * this.speed * delta;
    this.player.y += (dy / dist) * this.speed * delta;

    this.player.x = Math.round(this.player.x);
    this.player.y = Math.round(this.player.y);

    let direction = this.player.currentDirection;
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? "right" : "left";
    } else {
      direction = dy > 0 ? "down" : "up";
    }

    if (!this.player.isMoving || this.player.currentDirection !== direction) {
      this.player.playAnimation(direction);
    }

    socket.emit("playerMove", {
      x: this.player.x,
      y: this.player.y,
      direction,
      isMoving: true,
    });

    this.updateSceneDepths();
  }

  private updateSceneDepths() {
    if (!this.player || !this.groundLayer) return;

    this.roomItems?.updateDepths();

    // Restar PLAYER_Y_OFFSET antes de convertir a tile: ese offset es puro
    // ajuste visual (dónde se dibuja el sprite), no debe afectar a qué tile
    // "pertenece" el jugador para ordenar profundidad — si no se resta acá,
    // cambiar PLAYER_Y_OFFSET (ver tileAnchor.ts) puede correr el punto donde
    // el personaje pasa de "detrás" a "delante" de un mueble, desalineándolo
    // del límite visual real entre tiles.
    const playerTile = this.groundLayer.worldToTileXY(
      this.player.x,
      this.player.y - PLAYER_Y_OFFSET,
      false,
    );

    if (playerTile) {
      // playerTile.y SIN floor: los muebles tienen profundidad fija por
      // tile (y*1000+x), pero el jugador se mueve de forma continua. Si acá
      // se redondeaba a tile entero, dos objetos a 1 tile de distancia
      // quedaban con depths casi iguales (diferencia de un "salto" de 1000
      // recién al cruzar el borde exacto del tile) y el jugador parpadeaba
      // detrás/delante de forma incorrecta hasta cruzar ese borde. Usando el
      // valor fraccionario, el depth interpola en el camino y el cruce
      // delante/detrás pasa exactamente cuando visualmente corresponde, no
      // solo al llegar al tile siguiente.
      const depth = playerTile.y * 1000 + Math.floor(playerTile.x);

      this.player.setDepth(depth);

      // 🐛 DEBUG TEMPORAL — borrar después de diagnosticar el bug de
      // profundidad a 1 tile. Loguea ~4 veces/seg para poder leerlo mientras
      // caminás cerca de un mueble.
      if (this.game.loop.frame % 15 === 0) {
        console.log("🧍 PLAYER DEPTH", {
          tileX: playerTile.x,
          tileY: playerTile.y,
          depth,
        });
      }
    }

    this.otherPlayers.getChildren().forEach((child: any) => {
      const tile = this.groundLayer.worldToTileXY(
        child.x,
        child.y - PLAYER_Y_OFFSET,
        false,
      );

      if (tile && child.setDepth) {
        child.setDepth(tile.y * 1000 + Math.floor(tile.x));
      }

      child.hud?.update();
    });

    this.hud?.update();
  }

  private updateBuildPreviewTint(pointer: Phaser.Input.Pointer) {
    const item = this.buildSystem?.getCurrentItem();
    const preview = this.buildSystem?.getPreview();

    if (!item || !preview || !this.groundLayer || !this.placementValidator) {
      return;
    }

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileXY = this.groundLayer.worldToTileXY(
      worldPoint.x,
      worldPoint.y,
      false,
    );

    if (!tileXY) {
      preview.setTint(0xff4444);
      return;
    }

    const tx = Math.floor(tileXY.x);
    const ty = Math.floor(tileXY.y);
    const canPlace = this.placementValidator.canPlace(
      tx,
      ty,
      item,
      this.buildSystem.getRotation(),
    );

    const rotation = this.buildSystem.getRotation();

    const footprint = getDirectionalFootprint(item.worldData, rotation);
    const size = getFootprintSize(footprint);
    const tiles = toWorldTiles(tx, ty, footprint).map((tile) => ({
      x: tile.x - tx,
      y: tile.y - ty,
    }));
    const hasStackSupport = Boolean((this.roomItems as any)?.getStackTarget(tx, ty));

    this.buildSystem.drawFootprint(
      tx,
      ty,
      size.width,
      size.height,
      canPlace,
      tiles,
      hasStackSupport ? "stack" : "ground",
    );

    preview.setTint(hasStackSupport ? 0x44aaff : canPlace ? 0x55ff77 : 0xff4444);
  }

  private loadAvatarTextures(slots: AvatarSlot[], onComplete: () => void) {
    const urlsToLoad = new Set<string>();

    slots.forEach((slot) => {
      if (slot.imageUrl && !this.textures.exists(slot.imageUrl))
        urlsToLoad.add(slot.imageUrl);
      slot.sprites?.forEach((s) => {
        if (s.imageUrl && !this.textures.exists(s.imageUrl))
          urlsToLoad.add(s.imageUrl);
      });
    });

    if (urlsToLoad.size === 0) return onComplete();

    Promise.all(
      Array.from(urlsToLoad).map((url) =>
        loadTextureOnce(this, url).then(() => {
        this.loadedTextures.add(url);
        }),
      ),
    ).then(() => onComplete());
  }

  addOtherPlayer(playerData: Player) {
    const other = new ModularPlayer(
      this,
      playerData.x,
      playerData.y,
      [],
    ) as OtherPlayer;
    other.playerId = playerData.id;

    other.hud = new PlayerHUD({
      scene: this,
      playerSprite: other,
      username: playerData.username,
      level: playerData.level || 1,
    });

    this.otherPlayers.add(other);

    this.loadAvatarTextures(playerData.avatar.slots, () => {
      other.updateAvatar(playerData.avatar.slots, playerData.avatar.skinColor);
      other.playIdle();
    });
  }
}
