import Phaser from "phaser";
import { getApiUrl, getAssetsUrl } from "../../config/env";
import { Player } from "../types/player";
import ModularPlayer from "../players/ModularPlayer";
import PlayerHUD from "../hud/PlayerHUD";
import { AvatarSlot } from "../types/avatar";

import BuildSystem from "../systems/BuildSystem";
import PetSystem from "../systems/PetSystem";
import ButlerSystem from "../systems/ButlerSystem";
import BuildCommandStack from "../systems/BuildCommandStack";
import AmbientLightOverlay from "../systems/AmbientLightOverlay";
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
  toWorldTiles,
} from "../systems/IsoFootprint";
import { loadTextureOnce } from "../utils/phaserAssetCache";
import { getSharedAuthToken } from "../network/auth";
import { WORLD_OVERLAY_DEPTH } from "../utils/depth";
import { pointerToScreenPosition } from "../utils/pointerToScreenPosition";
import { burstConfetti, burstSparkle } from "../systems/ParticleFx";
import IsoGrid from "../iso/IsoGrid";
import IsoDebugOverlay from "../iso/IsoDebugOverlay";
import { syncActorDepth } from "../iso/IsoActorDepth";
import NavGrid, { type NavTile } from "../iso/NavGrid";
import TileWalkability, {
  parseWalkabilityDeclaration,
  type TileWalkabilityDeclaration,
} from "../iso/TileWalkability";

// Tileset compartido que se precarga en preload() antes de unirse a
// cualquier sala, y al que se cae si el layout de la sala no trae su propio
// tilesets[0] válido -- mismos valores que se usaban hardcodeados antes de
// que las salas pudieran declarar su propio tileset.
const DEFAULT_TILESET_NAME = "tiles3";
const DEFAULT_TILESET_KEY = "tiles";

export default class LobbyScene extends Phaser.Scene implements LobbySceneType {
  player!: ModularPlayer;
  otherPlayers!: Phaser.GameObjects.Group;
  hud!: PlayerHUD;

  private loadedTextures: Set<string> = new Set();
  private pcZone!: Phaser.GameObjects.Zone;

  map!: Phaser.Tilemaps.Tilemap;
  groundLayer!: Phaser.Tilemaps.TilemapLayer;

  // Autoridad geométrica de la sala activa (ver iso/IsoGrid.ts). Toda
  // conversión pantalla↔mundo↔tile y todo anclaje al suelo pasa por aquí.
  // Undefined mientras se carga o se cambia de sala, igual que map y
  // groundLayer.
  isoGrid?: IsoGrid;

  private isoDebug?: IsoDebugOverlay;

  private roomItems!: RoomItemsManager;
  private petSystem?: PetSystem;
  private onPetChanged = () => this.petSystem?.sync();
  private butlerSystem?: ButlerSystem;
  private onButlerChanged = () => this.butlerSystem?.sync();
  private placementValidator!: PlacementValidator;
  private ambientLight!: AmbientLightOverlay;

  // Navegación: autoridad única de colisión y rutas (ver iso/NavGrid.ts).
  private navGrid?: NavGrid;
  private currentPath: NavTile[] = [];
  // Destino final de la ruta activa, para poder recalcularla si un mueble
  // la invalida a mitad de camino sin tener que parar al jugador.
  private pathTarget: NavTile | null = null;
  private pendingPathId: number | null = null;
  private speed = 180;
  private arrivalThreshold = 5;

  // Sombra de contacto del jugador: antes no existía ninguna (ni para el
  // jugador ni para muebles) — todo "flotaba" sobre el tile sin ancla visual
  // al suelo, la diferencia más notoria entre un prototipo y un cliente
  // isométrico pulido (Habbo/Dofus). Se ancla solo al jugador por ahora; una
  // por cada mueble queda como mejora futura (más superficie de cambio:
  // habría que crearla/destruirla en cada addItem/removeItem).
  private playerShadow?: Phaser.GameObjects.Ellipse;

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
    tiles: TileWalkabilityDeclaration;
  } = {
    layoutOffset: { x: 0, y: 0 },
    cameraAnchor: null,
    tiles: {},
  };

  private mapLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  private selectedFloorTileIndex: number | null = null;
  private selectedSurfaceTexture: {
    item: any;
    width: number;
    height: number;
  } | null = null;
  private movingRoomItem: any = null;
  private buildCommandStack = new BuildCommandStack();
  // Item + rotación copiados con "Copiar" en FurnitureContextMenu — Ctrl+V
  // arranca una colocación nueva con este item, igual que elegirlo desde
  // BuildModePanel (mismo camino ya validado, sin lógica nueva de emisión).
  private clipboardItem: { item: any; rotation: number } | null = null;
  private thumbnailTimer?: ReturnType<typeof setTimeout>;
  private thumbnailInFlight = false;
  private canUpdateRoomThumbnail = false;
  private lastPaintedTileKey: string | null = null;
  // Tileset de la sala activa: "name" es el nombre que el propio JSON de
  // Tiled declara en tilesets[0].name (addTilesetImage matchea por eso),
  // "key" es la key de textura de Phaser donde se cargó esa imagen. Arrancan
  // en el tileset default precargado en preload() hasta unirse a una sala
  // con un tileset propio (ver room:joined en create()).
  private currentTilesetName: string = DEFAULT_TILESET_NAME;
  private currentTilesetKey: string = DEFAULT_TILESET_KEY;

  constructor() {
    super("LobbyScene");
  }

  preload() {
    this.load.setCORS("anonymous");
    this.load.image(DEFAULT_TILESET_KEY, `${getAssetsUrl()}/maps/rooms/${DEFAULT_TILESET_NAME}.png`);
  }

  create() {
    const tex = this.textures.get(DEFAULT_TILESET_KEY);
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

    const socket = (this.game as any).socket;
    const user = (this.game as any).user;
    this.backgroundManager = new BackgroundManager(this);
    this.ambientLight = new AmbientLightOverlay(this);
    // Overlay de verificación geométrica (F9). Apagado por defecto y sin
    // coste cuando lo está.
    this.isoDebug = new IsoDebugOverlay(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.isoDebug?.destroy();
      this.isoDebug = undefined;
    });

    socket.on("room:joined", (data: any) => {
      // Antes el cambio de sala era un corte seco: destroyCurrentMap()
      // vacía el canvas de inmediato y el jugador ve el backgroundColor
      // "#111" puro hasta que termina de cargar el tilemap nuevo, sin
      // ninguna señal de que la transición es intencional. Un fadeOut breve
      // antes de destruir (solo si ya había una sala cargada — en el primer
      // join no hay nada de qué "salir") y un fadeIn al terminar de
      // construir la sala nueva convierten ese fogonazo en una transición.
      const hadPreviousRoom = !!this.map;

      const loadNextRoom = () => {
        this.destroyCurrentMap();

        this.otherPlayers?.clear(true, true);

        this.roomItems?.clear();

        (this.game as any).roomId = data.room.id;
        this.canUpdateRoomThumbnail = data.room.ownerId === user?.userId;

        const layout = data.room.layout;
        if (!layout) return console.error("❌ Sala sin layout");

        // El tileset real de la sala se toma de layoutJson.tilesets[0] (lo que
        // sube el admin al crear/editar el layout) en vez de asumir siempre el
        // tileset default -- antes esa URL del JSON se ignoraba por completo y
        // toda sala usaba la misma imagen fija. Si el layout no trae un
        // tileset propio válido, o si falla la carga (404, CORS, etc.), cae
        // al default precargado en preload() para no dejar la sala sin tiles.
        const tilesetDef = (layout.layoutJson as any)?.tilesets?.[0];
        const hasCustomTileset =
          typeof tilesetDef?.name === "string" &&
          tilesetDef.name.length > 0 &&
          typeof tilesetDef?.image === "string" &&
          tilesetDef.image.length > 0;

        const resolveTileset: Promise<{ name: string; key: string }> = hasCustomTileset
          ? loadTextureOnce(this, tilesetDef.image)
              .then((key) => ({ name: tilesetDef.name as string, key: key || DEFAULT_TILESET_KEY }))
              .catch((err) => {
                console.error(
                  "❌ No se pudo cargar el tileset de la sala, uso el default:",
                  err,
                );
                return { name: DEFAULT_TILESET_NAME, key: DEFAULT_TILESET_KEY };
              })
          : Promise.resolve({ name: DEFAULT_TILESET_NAME, key: DEFAULT_TILESET_KEY });

        resolveTileset.then(({ name, key }) => {
          this.currentTilesetName = name;
          this.currentTilesetKey = key;

          const blob = new Blob([JSON.stringify(layout.layoutJson)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);

          if (this.cache.tilemap.exists("dynamic-map")) {
            this.cache.tilemap.remove("dynamic-map");
          }

          this.load.tilemapTiledJSON("dynamic-map", url);

          this.load.once("complete", () => {
            this.currentLayoutComposition = this.getLayoutComposition(layout.layoutJson);
            this.buildMap();
            this.backgroundManager.setBackground(data.room.background, {
              layoutAnchor: this.getCompositionCenter(),
            });
            this.createWorld(user, socket, data.players, data.items);
            this.ambientLight.setIntensity(data.room.ambientLightIntensity);
            this.cameras.main.fadeIn(250, 0, 0, 0);
            this.scheduleRoomThumbnailCapture(2200);
          });

          this.load.start();
        });
      };

      if (hadPreviousRoom) {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once(
          Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
          loadNextRoom,
        );
      } else {
        loadNextRoom();
      }
    });

    socket.on("room:backgroundChanged", (data: any) => {
      this.backgroundManager.setBackground(data.background, {
        layoutAnchor: this.getCompositionCenter(),
      });
      this.scheduleRoomThumbnailCapture(1400);
    });

    // Actualización en vivo: cuando el dueño mueve el slider de Iluminación
    // en Editar Mundo, todos los que están en la sala ven el cambio sin
    // recargar (antes esto no tenía ningún listener del lado del cliente).
    socket.on("room:lighting:changed", (data: any) => {
      if (data.roomId !== (this.game as any).roomId) return;
      this.ambientLight.setIntensity(data.ambientLightIntensity);
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

    // Puente UI (React) -> Phaser para los dos presets mínimos de partículas
    // (ver systems/ParticleFx.ts): React no tiene acceso directo a la escena,
    // así que dispara un CustomEvent y acá se resuelve contra la posición
    // actual del jugador — mismo patrón que el resto de puentes UI->juego de
    // esta función (build:item:selected, etc.).
    window.addEventListener("fx:sparkle", () => {
      if (!this.player) return;
      burstSparkle(this, this.player.x, this.player.y - 40);
    });

    window.addEventListener("fx:confetti", () => {
      if (!this.player) return;
      burstConfetti(this, this.player.x, this.player.y - 60);
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

      // Ghost real en vez de reenvío a ciegas: mismo mecanismo de preview
      // que colocar un mueble nuevo (BuildSystem + PlacementValidator),
      // arrancando en la rotación actual del mueble para que no "salte" de
      // orientación al empezar a arrastrarlo.
      if (this.movingRoomItem?.item) {
        this.buildSystem.start(this.movingRoomItem.item, this.movingRoomItem.rotation ?? 0);
      }
    });

    // El lado React (Game.tsx) dispara esto al cerrar el menú de un mueble
    // (Escape, botón X, o tras rotar/mover/recoger) — acá solo se limpia el
    // tinte del sprite, nada más.
    window.addEventListener("room:item:deselected", () => {
      this.roomItems?.clearSelection();
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
        this.stepZoom(deltaY > 0 ? -1 : 1);
      },
    );

    // Controles de zoom en pantalla (-/+, ver ZoomControls.tsx) — mismo
    // método que ya usaba la rueda del mouse, para que ambas formas de
    // hacer zoom queden siempre en sincronía con los mismos 3 niveles.
    window.addEventListener("camera:zoom:in", () => this.stepZoom(1));
    window.addEventListener("camera:zoom:out", () => this.stepZoom(-1));

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

    // ❌ ESC para cancelar pintura o un mueble que se está moviendo
    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.selectedSurfaceTexture || this.selectedFloorTileIndex !== null) {
        window.dispatchEvent(new CustomEvent("build:surface:cancel"));
      }

      if (this.movingRoomItem) {
        this.movingRoomItem = null;
        this.buildSystem.stop();
      }
    });

    // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y — deshacer/rehacer mover y rotar (ver
    // BuildCommandStack.ts para el alcance y por qué no incluye colocar/
    // eliminar).
    this.input.keyboard?.on("keydown-Z", (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      if (event.shiftKey) {
        this.redoBuildCommand();
      } else {
        this.undoBuildCommand();
      }
    });
    this.input.keyboard?.on("keydown-Y", (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      this.redoBuildCommand();
    });

    // Ctrl+V — pega lo copiado con "Copiar" en FurnitureContextMenu
    // arrancando una colocación nueva (mismo camino que elegir un item
    // desde BuildModePanel, ya validado por FurniturePlacementSystem).
    this.input.keyboard?.on("keydown-V", (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || !this.clipboardItem) return;
      event.preventDefault();
      this.buildSystem.start(this.clipboardItem.item, this.clipboardItem.rotation);
    });

    window.addEventListener("build:item:copy", (event: any) => {
      const furniture = event.detail;
      if (!furniture?.item) return;
      this.clipboardItem = { item: furniture.item, rotation: furniture.rotation ?? 0 };
    });

    window.addEventListener("build:item:duplicate", (event: any) => {
      this.duplicateRoomItem(event.detail);
    });

    // Contraparte en React de los atajos Ctrl+Z/Ctrl+Y de arriba: los
    // botones de deshacer/rehacer del panel de construcción (BuildModePanel)
    // no tienen acceso directo a la escena de Phaser, así que llegan acá
    // como el resto de las acciones de construcción (mismo patrón que
    // build:item:copy/duplicate).
    window.addEventListener("build:command:undo", () => this.undoBuildCommand());
    window.addEventListener("build:command:redo", () => this.redoBuildCommand());
  }

  // Un solo paso en los 3 niveles fijos de zoom [1,2,3] — extraído de la
  // rueda del mouse para que los botones -/+ en pantalla (ZoomControls.tsx)
  // usen exactamente la misma lógica y terminen siempre en el mismo nivel,
  // sin importar cuál de las dos formas se usó para llegar ahí.
  private stepZoom(direction: 1 | -1) {
    const zoomLevels = [1, 2, 3];
    let currentIndex = zoomLevels.indexOf(this.cameras.main.zoom);
    // -1 si el zoom actual está a mitad de un tween anterior (valor
    // fraccionario que no matchea ninguno de los 3 niveles exactos).
    if (currentIndex === -1) currentIndex = 0;

    currentIndex = Phaser.Math.Clamp(currentIndex + direction, 0, zoomLevels.length - 1);

    // Antes: setZoom() instantáneo, un salto brusco entre los 3 niveles. Un
    // tween corto da sensación de "acercarse" en vez de teletransportarse.
    this.tweens.add({
      targets: this.cameras.main,
      zoom: zoomLevels[currentIndex],
      duration: 200,
      ease: "Cubic.easeOut",
    });
  }

  private undoBuildCommand() {
    const command = this.buildCommandStack.undo();
    if (!command) return;

    const socket = (this.game as any).socket;

    if (command.type === "move") {
      socket.emit("room:item:move", {
        roomItemId: command.roomItemId,
        x: command.from.x,
        y: command.from.y,
        rotation: command.from.rotation,
      });
    } else if (command.type === "rotate") {
      // Un solo giro siempre suma 1 (mod 4) en el servidor — no existe
      // "rotar a un valor exacto", así que deshacer un giro es girar 3
      // veces más (vuelve al valor original).
      for (let i = 0; i < 3; i++) {
        socket.emit("room:item:rotate", { roomItemId: command.roomItemId });
      }
    }
  }

  private redoBuildCommand() {
    const command = this.buildCommandStack.redo();
    if (!command) return;

    const socket = (this.game as any).socket;

    if (command.type === "move") {
      socket.emit("room:item:move", {
        roomItemId: command.roomItemId,
        x: command.to.x,
        y: command.to.y,
        rotation: command.to.rotation,
      });
    } else if (command.type === "rotate") {
      socket.emit("room:item:rotate", { roomItemId: command.roomItemId });
    }
  }

  // Coloca una copia del mueble clickeado en la primera casilla libre
  // adyacente — a diferencia de mover/pegar, es una acción instantánea (sin
  // ghost interactivo), así que valida y emite directo con el mismo
  // contrato que ya usa FurniturePlacementSystem.
  private duplicateRoomItem(furniture: any) {
    if (!furniture?.item || !this.placementValidator) return;

    const candidates = [
      { x: furniture.tileX + 1, y: furniture.tileY },
      { x: furniture.tileX - 1, y: furniture.tileY },
      { x: furniture.tileX, y: furniture.tileY + 1 },
      { x: furniture.tileX, y: furniture.tileY - 1 },
    ];

    const target = candidates.find((candidate) =>
      this.placementValidator!.canPlace(
        candidate.x,
        candidate.y,
        furniture.item,
        furniture.rotation ?? 0,
      ),
    );

    if (!target) {
      console.warn("No hay espacio libre junto al mueble para duplicar");
      return;
    }

    const socket = (this.game as any).socket;
    const roomId = (this.game as any).roomId;

    socket.emit("room:item:place", {
      roomId,
      itemId: furniture.item.id,
      x: target.x,
      y: target.y,
      rotation: furniture.rotation ?? 0,
      ...(furniture.wallSide ? { wallSide: furniture.wallSide, wallOffset: furniture.wallOffset } : {}),
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

      const apiUrl = getApiUrl();
      const token = getSharedAuthToken();
      const response = await fetch(`${apiUrl}/uploads`, {
        method: "POST",
        body: formData,
        // Sin esto, /uploads (protegido con JwtAuthGuard) devolvía 401 en
        // silencio: la miniatura de la sala nunca llegaba a subirse ni a
        // emitir "room:thumbnail:update", así que la imagen jamás se
        // actualizaba aunque toda la lógica de captura corriera bien.
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
    // Sin esto, this.children.removeAll(true) más abajo destruye el rect de
    // oscuridad por debajo nuestro (es un child más de la escena) pero
    // AmbientLightOverlay.rect queda apuntando a un objeto ya destruido —
    // el próximo setIntensity() no lo recrearía, solo intentaría animar un
    // GameObject muerto.
    this.ambientLight?.destroy();

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
    this.isoGrid = undefined;
    this.navGrid = undefined;
    this.currentPath = [];
    this.pathTarget = null;
    this.pendingPathId = null;
    this.isoDebug?.setGrid(undefined);
  }

  private buildMap() {
    this.map = this.make.tilemap({ key: "dynamic-map" });

    const tileset = this.map.addTilesetImage(this.currentTilesetName, this.currentTilesetKey);
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

    // La geometría de la sala se deriva del tileset REAL que acaba de
    // cargarse (tamaño de celda y tileoffset), no de constantes: un tileset
    // de otro tamaño en otra sala sigue funcionando sin tocar nada.
    //
    // La caminabilidad viene de los datos (propiedad `walkable` del tileset
    // de Tiled, o `__codebuddies.tiles` del layoutJson). Sin declaración se
    // mantiene el comportamiento histórico: todo tile pintado es suelo.
    if (this.groundLayer) {
      const walkability = new TileWalkability(
        this.map.tilesets,
        this.currentLayoutComposition.tiles,
      );
      this.isoGrid = new IsoGrid(this.map, this.groundLayer, tileset, walkability);
      this.isoDebug?.setGrid(this.isoGrid);
    }
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
      // Declaración de caminabilidad por GID (puente mientras el tileset de
      // Tiled no lleve la propiedad `walkable` por tile). Ver
      // iso/TileWalkability.ts para el orden de prioridad.
      tiles: parseWalkabilityDeclaration(config.tiles),
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

  /**
   * Punto de apoyo donde aparece el jugador al entrar en la sala.
   *
   * OJO CON EL ORDEN DE ARRANQUE: esto corre al principio de createWorld,
   * cuando todavía NO existen ni `navGrid` (se crea en setupPathfinding, al
   * final) ni `roomItems`. Por eso NO puede usar `isWalkable()`: esa
   * consulta va contra navGrid y devolvería siempre false, mandando el
   * spawn al fallback en TODAS las salas. Aquí sólo se puede preguntar por
   * el terreno, que es justo lo que hace falta — los muebles aún no se han
   * cargado.
   *
   * Tampoco hay ya un literal (250, 250) de reserva: era una coordenada de
   * mundo arbitraria que caía dentro de la pared. Si el centro no es suelo
   * se busca en anillos el suelo más cercano, que siempre existe salvo que
   * la sala esté completamente vacía.
   */
  private resolveSpawnPosition(): [number, number] | null {
    if (!this.isoGrid) return null;

    const cx = Math.floor(this.isoGrid.width / 2);
    const cy = Math.floor(this.isoGrid.height / 2);

    const spawnTile = this.findNearestFloorTile(cx, cy);
    if (!spawnTile) return null;

    // Ancla de suelo, el mismo punto al que apunta cada paso al caminar
    // (ver update()), para que el jugador no dé un saltito en su primer
    // movimiento.
    const anchor = this.isoGrid.groundAnchor(spawnTile.x, spawnTile.y);
    return anchor ? [anchor.x, anchor.y] : null;
  }

  /** Suelo más cercano a (cx, cy) en anillos crecientes. Sólo terreno. */
  private findNearestFloorTile(cx: number, cy: number): NavTile | null {
    const grid = this.isoGrid;
    if (!grid) return null;

    if (grid.isFloorTile(cx, cy)) return { x: cx, y: cy };

    const maxRadius = Math.max(grid.width, grid.height);

    for (let r = 1; r <= maxRadius; r++) {
      let best: NavTile | null = null;
      let bestDistance = Infinity;

      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;

          const x = cx + dx;
          const y = cy + dy;
          if (!grid.isFloorTile(x, y)) continue;

          const distance = dx * dx + dy * dy;
          if (distance < bestDistance) {
            bestDistance = distance;
            best = { x, y };
          }
        }
      }

      if (best) return best;
    }

    return null;
  }

  private setBuildMode(active: boolean) {
    const hudContainer = (this.hud as any)?.container;
    if (hudContainer?.setVisible) {
      hudContainer.setVisible(!active);
    }
  }

  private createWorld(user: any, socket: any, players: Player[], items: any[]) {
    // Sin grid no hay sala: buildMap() aborta si el tileset no se resolvió
    // (addTilesetImage devuelve null) y entonces no hay geometría con la que
    // colocar nada. Antes esto seguía adelante y reventaba más abajo en el
    // primer tileToWorldXY sobre una capa inexistente.
    if (!this.isoGrid || !this.groundLayer) {
      console.error("❌ No se pudo construir la sala: falta el tilemap/tileset");
      return;
    }

    this.pcZone = this.add.zone(300, 300, 100, 100);
    this.physics.add.existing(this.pcZone);

    this.cameras.main.roundPixels = true;

    // El constructor recibe el PUNTO DE APOYO (dónde pisa), no el origen
    // del Container: ModularPlayer deriva ese origen midiendo el avatar.
    const spawn = this.resolveSpawnPosition();
    if (!spawn) {
      console.error("❌ La sala no tiene ninguna casilla de suelo donde aparecer");
      return;
    }
    const [spawnX, spawnY] = spawn;
    this.player = new ModularPlayer(this, spawnX, spawnY, []);

    // Elipse plana y semitransparente bajo los pies del jugador. Se dibuja
    // exactamente en el punto de apoyo, sin ningún offset propio: si la
    // sombra se ve descolocada, lo que está mal es el ancla, no la sombra.
    // Tamaño derivado del tile, no dos literales.
    const shadow = {
      w: this.isoGrid.tileWidth * 0.6,
      h: this.isoGrid.tileHeight * 0.5,
    };
    const playerGround = this.player.getGroundPoint();
    this.playerShadow = this.add.ellipse(
      playerGround.x,
      playerGround.y,
      shadow.w,
      shadow.h,
      0x000000,
      0.35,
    );

    if (this.currentLayoutComposition.cameraAnchor) {
      const compositionCenter = this.getCompositionCenter();
      this.cameras.main.centerOn(
        compositionCenter.x + this.currentLayoutComposition.cameraAnchor.x,
        compositionCenter.y + this.currentLayoutComposition.cameraAnchor.y,
      );
    }

    // lerp 0.1: antes la cámara estaba pegada 1:1 a la posición del jugador
    // (default de Phaser = sin suavizado), lo que se siente rígido. Con un
    // pequeño retraso, la cámara "persigue" al personaje en vez de
    // teletransportarse con él cada frame.
    this.cameras.main.startFollow(this.player, false, 0.1, 0.1);
    this.cameras.main.roundPixels = true;
    this.cameras.main.setZoom(1);

    this.roomItems = new RoomItemsManager(this, this.isoGrid);

    // Mascota del jugador: se muestra siguiéndolo si la "sacó" a esta sala
    // (Pet.activeRoomId). Se resincroniza cuando el panel de mascota emite
    // "pet:changed" y al cerrar la escena se limpia.
    this.petSystem = new PetSystem(this);
    void this.petSystem.sync();
    window.addEventListener("pet:changed", this.onPetChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("pet:changed", this.onPetChanged);
      this.petSystem?.destroy();
      this.petSystem = undefined;
    });

    // Mayordomo: mismo ciclo que la mascota, pero deambula en vez de seguir
    // (ver ButlerSystem). Se resincroniza con "butler:changed".
    this.butlerSystem = new ButlerSystem(this);
    void this.butlerSystem.sync();
    window.addEventListener("butler:changed", this.onButlerChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("butler:changed", this.onButlerChanged);
      this.butlerSystem?.destroy();
      this.butlerSystem = undefined;
    });

    this.furnitureSockets = new FurnitureSocketSystem(
      this,
      this.roomItems,
      socket,
    );

    this.furnitureSockets.initialize();

    console.log("🔥 PLAYER SOCKET INIT");

    this.playerSockets = new PlayerSocketSystem(this, socket);

    this.playerSockets.initialize();

    // El payload del servidor ya tiene la forma que espera addItem; el
    // anclaje y la profundidad los resuelve RoomItemsManager con IsoGrid.
    // Sin refresco de navegación por item: la carga inicial hacía una
    // reconstrucción completa de la rejilla por CADA mueble. Se sincroniza
    // una sola vez cuando han entrado todos (ver el .then de abajo).
    const spawnRoomItem = (item: any, textureKey: string) => {
      this.roomItems.addItem(item, textureKey);
    };

    // Promise.all + updateDepths() al final, no forEach suelto: cada item
    // carga su textura en paralelo y se agrega a roomItems en el orden en
    // que resuelve esa promesa (no el orden de la lista), así que un item
    // apilado (parentRoomItemId) podía agregarse ANTES que su mueble base
    // -- getBaseDepthTile() no encontraba el padre todavía en this.items y
    // calculaba el depth solo con su propia tile, quedando detrás del
    // mueble base tras cada recarga aunque la colocación en vivo (donde el
    // padre ya existe de antes) se viera bien.
    Promise.all(
      items.map((item) =>
        loadTextureOnce(this, item.item.imageUrl).then((textureKey) =>
          spawnRoomItem(item, textureKey),
        ),
      ),
    ).then(() => {
      this.roomItems.updateDepths();
      this.refreshPathfinding();
    });

    this.placementValidator = new PlacementValidator();
    this.placementValidator.configure(this.isoGrid, this.roomItems);

    this.buildSystem = new BuildSystem(this);

    // Puente para FurnitureContextMenu (React): registra el "deshacer" de
    // un giro justo antes de emitirlo, mismo patrón que window.phaserSocket.
    (window as any).buildCommandStack = this.buildCommandStack;

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
      chatBubbleThemeId: user.chatBubbleThemeId ?? undefined,
      nameEffectId: user.nameEffectId ?? undefined,
    });

    this.otherPlayers = this.add.group();

    // Rombo del tamaño real de la rejilla, no un literal 64x32: si una sala
    // usara otro tileWidth/tileHeight el resaltado seguiría encajando.
    const tw = this.isoGrid.tileWidth;
    const th = this.isoGrid.tileHeight;

    // El resaltado se recrea en cada sala, así que la memoria de "ya estoy
    // en este tile" debe reiniciarse o el primer hover sobre la misma
    // coordenada de la sala nueva no lo haría aparecer.
    this.lastHoverTile = { x: -1, y: -1 };

    this.hoverHighlight = this.add
      .polygon(
        0,
        0,
        [tw / 2, 0, tw, th / 2, tw / 2, th, 0, th / 2],
        0xffff44,
        0.45,
      )
      // Antes 150: por debajo de la profundidad real de cualquier mueble/
      // avatar desde la fila 1 en adelante, así que el resaltado quedaba
      // oculto casi en todo el mapa.
      .setDepth(WORLD_OVERLAY_DEPTH)
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
        void this.hud.refreshAvatarHead(playerData.avatar.slots);
      } else {
        this.addOtherPlayer(playerData);
      }
    });
  }

  private setupPathfinding() {
    if (!this.isoGrid) return console.error("❌ No isoGrid");

    this.navGrid = new NavGrid(this.isoGrid);
    this.syncBlockedTiles();
  }

  private isWalkable(tx: number, ty: number): boolean {
    return this.navGrid?.isWalkable(tx, ty) ?? false;
  }

  /**
   * Sincroniza la navegación con los muebles actuales.
   *
   * Antes esto era `refreshPathfinding()`: creaba una instancia nueva de
   * EasyStar, reconstruía la rejilla entera y hacía `currentPath = []`.
   * Resultado: colocar un mueble en cualquier rincón DETENÍA EN SECO a
   * todos los jugadores de la sala, y en la carga inicial se repetía una
   * vez por cada mueble.
   *
   * Ahora se aplica sólo el delta de casillas, y la ruta activa se recalcula
   * únicamente si el cambio la toca de verdad.
   */
  refreshPathfinding() {
    this.syncBlockedTiles();
  }

  private syncBlockedTiles() {
    if (!this.navGrid) return;

    const changed = this.navGrid.setBlockedTiles(
      this.roomItems?.getBlockingTiles() ?? new Set<string>(),
    );

    if (!changed.length || !this.currentPath.length) return;

    // ¿El cambio afecta a los pasos que quedan por recorrer?
    const remaining = new Set(
      this.currentPath.map((step) => `${step.x},${step.y}`),
    );
    const affectsRoute = changed.some((tile) =>
      remaining.has(`${tile.x},${tile.y}`),
    );

    if (affectsRoute) this.repathToCurrentTarget();
  }

  /**
   * Recalcula la ruta hacia el destino vigente desde donde esté el jugador.
   * Si el destino ya no es alcanzable, se busca la casilla libre más cercana
   * a él en vez de dejar al jugador plantado.
   */
  private repathToCurrentTarget() {
    if (!this.navGrid || !this.pathTarget) return;

    const from = this.playerTile();
    if (!from) return;

    const target =
      this.navGrid.nearestWalkable(this.pathTarget.x, this.pathTarget.y) ??
      null;

    if (!target || (from.x === target.x && from.y === target.y)) {
      this.currentPath = [];
      this.pathTarget = null;
      return;
    }

    this.requestPath(from, target);
  }

  /**
   * Única puerta de entrada a la búsqueda de rutas. Cancela la búsqueda
   * anterior si seguía en vuelo (antes esto se "resolvía" creando una
   * instancia nueva de EasyStar, que además tiraba las de todos los demás).
   */
  private requestPath(from: NavTile, to: NavTile) {
    if (!this.navGrid) return;

    this.navGrid.cancelPath(this.pendingPathId);
    this.pathTarget = { x: to.x, y: to.y };

    this.pendingPathId = this.navGrid.findPath(from, to, (path) => {
      this.pendingPathId = null;
      if (path && path.length > 1) {
        this.currentPath = path.slice(1);
      }
    });
  }

  // ====================== HIGHLIGHT CORREGIDO (más preciso) ======================
  private updateHoverHighlight(pointer: Phaser.Input.Pointer) {
    if (!this.isoGrid) return;

    const tile = this.isoGrid.pointerToTile(this.cameras.main, pointer);

    if (!tile) {
      this.hoverHighlight.setVisible(false);
      return;
    }

    if (tile.x === this.lastHoverTile.x && tile.y === this.lastHoverTile.y) {
      return;
    }
    this.lastHoverTile = { x: tile.x, y: tile.y };

    if (!this.isWalkable(tile.x, tile.y)) {
      this.hoverHighlight.setVisible(false);
      return;
    }

    // El polígono del resaltado se posiciona por el CENTRO de su bounding
    // box, así que se ancla al centro del rombo de suelo — el mismo que
    // devuelve IsoGrid para el footprint de construcción y para la base de
    // los muebles. Antes era una tercera fórmula independiente.
    const center = this.isoGrid.groundCenter(tile.x, tile.y);

    if (center) {
      this.hoverHighlight.setPosition(center.x, center.y);
      this.hoverHighlight.setVisible(true);
    }
  }

  private handleClickToMove(pointer: Phaser.Input.Pointer) {
    if (!this.isoGrid) return;
    // this.movingRoomItem primero: al mover un mueble ya colocado,
    // buildSystem.getCurrentItem() también queda con valor (mismo ghost que
    // colocar uno nuevo), así que el guard de abajo bloqueaba por completo
    // moveSelectedRoomItem() y el click nunca llegaba a emitir
    // room:item:move — quedaba muerto detrás de este return.
    if (this.movingRoomItem) {
      if (this.moveSelectedRoomItem(pointer)) return;
    }
    if (this.buildSystem?.getCurrentItem()) return;
    if (this.paintSelectedSurfaceTexture(pointer)) return;
    if (this.paintSelectedFloorTile(pointer)) return;

    // Clicar en cualquier otro lado (piso, o directamente para caminar)
    // deselecciona el mueble resaltado y cierra su menú — caminar nunca
    // debe quedar bloqueado por una selección previa.
    if (this.roomItems?.clearSelection()) {
      window.dispatchEvent(new CustomEvent("room:item:deselected"));
    }

    const target = this.isoGrid.pointerToTile(this.cameras.main, pointer);

    if (!target || !this.navGrid) return;

    if (!this.isWalkable(target.x, target.y)) return;

    // Tile de ORIGEN a partir del punto de apoyo del jugador (sus pies).
    // Antes el destino y el origen se calculaban con dos criterios
    // distintos dentro de esta misma función.
    const from = this.playerTile();
    if (!from) return;

    if (from.x === target.x && from.y === target.y) return;

    // Si el jugador quedó dentro de una huella que se bloqueó bajo sus
    // pies, EasyStar no encontraría salida desde ahí: primero se sale
    // andando a la casilla libre más cercana.
    if (!this.isWalkable(from.x, from.y)) {
      this.unstickPlayer();
      return;
    }

    this.requestPath(from, target);
  }

  /**
   * Saca al jugador de una casilla que quedó bloqueada bajo sus pies
   * (alguien colocó un mueble justo encima mientras caminaba).
   *
   * Le da un DESTINO al que ir andando, no una posición a la que saltar:
   * nada de teletransportes. Si no hay salida en el radio de búsqueda, se
   * deja como está en vez de inventar una posición.
   */
  private unstickPlayer() {
    if (!this.navGrid) return;

    const from = this.playerTile();
    if (!from || this.isWalkable(from.x, from.y)) return;

    const escape = this.navGrid.nearestWalkable(from.x, from.y);
    if (!escape) return;

    this.currentPath = [escape];
    this.pathTarget = escape;
  }

  /** Tile que ocupa el jugador, resuelto desde su punto de apoyo. */
  private playerTile() {
    if (!this.isoGrid || !this.player) return null;
    const ground = this.player.getGroundPoint();
    const tile = this.isoGrid.worldToGroundTile(ground.x, ground.y);
    return tile ? { x: Math.floor(tile.x), y: Math.floor(tile.y) } : null;
  }

  private moveSelectedRoomItem(pointer: Phaser.Input.Pointer) {
    if (!this.movingRoomItem || !this.isoGrid) return false;

    const tile = this.isoGrid.pointerToTile(this.cameras.main, pointer);

    if (!tile || !this.isoGrid.contains(tile.x, tile.y)) return true;

    const tx = tile.x;
    const ty = tile.y;

    // Antes esto emitía a ciegas apenas se clickeaba, sin ghost ni
    // validación — el servidor lo rechazaba en silencio si la casilla
    // estaba ocupada, sin ningún feedback visual. Ahora reusa el mismo
    // canPlace() que ya pinta el rombo verde/rojo cada frame: si la casilla
    // está inválida, no se emite nada y el ghost sigue activo para que el
    // jugador pruebe otra posición.
    const canPlace = this.placementValidator?.canPlace(
      tx,
      ty,
      this.movingRoomItem.item,
      this.buildSystem.getRotation(),
      this.movingRoomItem.roomItemId,
    );

    if (!canPlace) {
      return true;
    }

    this.buildCommandStack.push({
      type: "move",
      roomItemId: this.movingRoomItem.roomItemId,
      from: {
        x: this.movingRoomItem.tileX,
        y: this.movingRoomItem.tileY,
        rotation: this.movingRoomItem.rotation,
      },
      to: { x: tx, y: ty, rotation: this.buildSystem.getRotation() },
    });

    const socket = (this.game as any).socket;

    socket.emit("room:item:move", {
      roomItemId: this.movingRoomItem.roomItemId,
      x: tx,
      y: ty,
      rotation: this.buildSystem.getRotation(),
    });

    this.movingRoomItem = null;
    this.buildSystem.stop();

    return true;
  }

  private paintSelectedSurfaceTexture(pointer: Phaser.Input.Pointer) {
    if (!this.selectedSurfaceTexture || !this.isoGrid) return false;

    const tile = this.isoGrid.pointerToTile(this.cameras.main, pointer);

    if (!tile || !this.isoGrid.contains(tile.x, tile.y)) return true;

    const tx = tile.x;
    const ty = tile.y;

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

    const paintKey =`${tx}:${ty}:${item.id}:${this.selectedSurfaceTexture.width}:${this.selectedSurfaceTexture.height}`;
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
    if (this.selectedFloorTileIndex === null || !this.isoGrid) return false;

    const tile = this.isoGrid.pointerToTile(this.cameras.main, pointer);

    if (!tile || !this.isoGrid.contains(tile.x, tile.y)) return true;

    const tx = tile.x;
    const ty = tile.y;

    const paintKey = `${tx}:${ty}:${this.selectedFloorTileIndex}`;
    if (this.lastPaintedTileKey === paintKey) return true;
    this.lastPaintedTileKey = paintKey;

    this.groundLayer.putTileAt(this.selectedFloorTileIndex, tx, ty);
    // Pintar cambia el TERRENO de esa casilla (el tile nuevo puede ser
    // suelo o no serlo), no los muebles: se refresca sólo esa celda en vez
    // de reconstruir la rejilla entera.
    this.navGrid?.refreshTerrainAt(tx, ty);

    return true;
  }

  update() {
    this.buildSystem?.update(this.input.activePointer);
    this.updateBuildPreviewTint(this.input.activePointer);
    this.petSystem?.update(this.game.loop.delta);
    this.butlerSystem?.update(this.game.loop.delta);
    if (!this.player || !this.isoGrid || !this.navGrid) return;

    const socket = (this.game as any).socket;
    this.navGrid.update();
    this.updateSceneDepths();
    this.updateIsoDebug();

    // Todo el movimiento se razona sobre el PUNTO DE APOYO del jugador, no
    // sobre el origen de su Container: así el destino de cada paso es
    // literalmente el ancla de suelo de la casilla, sin ninguna constante
    // de por medio. Lo que se emite por red también es ese punto, porque
    // cada cliente tiene un footOffsetY distinto según el avatar.
    const ground = this.player.getGroundPoint();

    if (this.currentPath.length === 0) {
      if (this.player.isMoving) {
        this.player.playIdle();
        socket.emit("playerMove", {
          x: ground.x,
          y: ground.y,
          direction: this.player.currentDirection,
          isMoving: false,
        });
      }
      return;
    }

    const next = this.currentPath[0];

    // REVALIDACIÓN ANTES DE ENTRAR (4.6). La ruta se calculó en el pasado;
    // entre medias alguien pudo colocar un mueble sobre esta casilla. Antes
    // no se comprobaba nada después del click, así que el personaje entraba
    // igual y atravesaba el obstáculo.
    if (!this.navGrid.isWalkable(next.x, next.y)) {
      this.repathToCurrentTarget();
      return;
    }

    const anchor = this.isoGrid.groundAnchor(next.x, next.y);
    if (!anchor) {
      this.currentPath.shift();
      return;
    }

    const dx = anchor.x - ground.x;
    const dy = anchor.y - ground.y;
    const dist = Math.hypot(dx, dy);

    if (dist < this.arrivalThreshold) {
      this.currentPath.shift();
      this.player.setGroundPosition(anchor.x, anchor.y);

      if (this.currentPath.length === 0) {
        this.pathTarget = null;
        this.player.playIdle();
        socket.emit("playerMove", {
          x: anchor.x,
          y: anchor.y,
          direction: this.player.currentDirection,
          isMoving: false,
        });
      }
      return;
    }

    const delta = this.game.loop.delta / 1000;
    const step = this.speed * delta;

    this.player.setGroundPosition(
      Math.round(ground.x + (dx / dist) * step),
      Math.round(ground.y + (dy / dist) * step),
    );

    let direction = this.player.currentDirection;
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? "right" : "left";
    } else {
      direction = dy > 0 ? "down" : "up";
    }

    if (!this.player.isMoving || this.player.currentDirection !== direction) {
      this.player.playAnimation(direction);
    }

    const moved = this.player.getGroundPoint();

    socket.emit("playerMove", {
      x: moved.x,
      y: moved.y,
      direction,
      isMoving: true,
    });

    this.updateSceneDepths();
  }

  /** Alimenta el overlay de verificación geométrica (F9). Sin coste si está off. */
  private updateIsoDebug() {
    if (!this.isoDebug?.isEnabled() || !this.isoGrid) return;

    const pointer = this.input.activePointer;
    const targets: {
      label: string;
      groundX: number;
      groundY: number;
      originY?: number;
      detail?: string;
    }[] = [];

    if (this.player) {
      const g = this.player.getGroundPoint();
      targets.push({
        label: "jugador",
        groundX: g.x,
        groundY: g.y,
        originY: this.player.y,
        // Qué partes del avatar llegan más abajo: la que manda es la que
        // fija dónde se cree que están los pies.
        detail: this.player
          .getFootMeasurement()
          .slice(0, 3)
          .map((m) => `${m.slot}=${m.bottom.toFixed(0)}(h${m.height.toFixed(0)})`)
          .join(" "),
      });
    }

    // Tiles del mueble bajo el cursor, para verificar el anclaje por
    // footprint de los muebles de varias casillas.
    const tile = this.isoGrid.pointerToTile(this.cameras.main, pointer);
    let footprintTiles: { x: number; y: number }[] | undefined;

    if (tile) {
      const item = this.roomItems?.getHighestItemAt(tile.x, tile.y);
      if (item) {
        footprintTiles = toWorldTiles(
          item.tileX,
          item.tileY,
          getDirectionalFootprint(item.item?.worldData, item.rotation),
        );
      }
    }

    this.isoDebug.update(pointer, targets, footprintTiles);
  }

  private updateSceneDepths() {
    if (!this.player || !this.isoGrid) return;

    // No se recorren los muebles aquí: su profundidad solo cambia al
    // colocarse/moverse/rotarse, y esos tres eventos ya la actualizan
    // puntualmente (ver FurnitureSocketSystem). Recorrer la sala entera 60
    // veces por segundo era trabajo repetido sin nada que reflejar.
    //
    // Los actores sí se recalculan cada frame porque se mueven de forma
    // continua. syncActorDepth usa el punto de apoyo SIN redondear a tile:
    // así el cruce delante/detrás ocurre exactamente donde visualmente
    // corresponde y no al saltar de casilla.
    const depth = syncActorDepth(this, this.player);

    const ground = this.player.getGroundPoint();

    // La sombra va literalmente en el punto de apoyo, sin offset propio, y
    // justo por debajo del jugador (nunca invade la línea de profundidad
    // siguiente, que está 1000 más arriba).
    this.playerShadow?.setPosition(ground.x, ground.y);
    this.playerShadow?.setDepth(depth - 1);

    this.otherPlayers.getChildren().forEach((child: any) => {
      syncActorDepth(this, child);
      child.hud?.update();
    });

    this.hud?.update();
  }

  private updateBuildPreviewTint(pointer: Phaser.Input.Pointer) {
    const item = this.buildSystem?.getCurrentItem();
    const preview = this.buildSystem?.getPreview();

    if (!item || !preview || !this.isoGrid || !this.placementValidator) {
      return;
    }

    const tile = this.isoGrid.pointerToTile(this.cameras.main, pointer);

    if (!tile) {
      preview.setTint(0xff4444);
      return;
    }

    const { x: tx, y: ty } = tile;
    const canPlace = this.placementValidator.canPlace(
      tx,
      ty,
      item,
      this.buildSystem.getRotation(),
      this.movingRoomItem?.roomItemId,
    );

    // Tiles ABSOLUTOS: drawFootprint los resuelve con IsoGrid.groundDiamond,
    // la misma fuente que el resaltado del cursor. Antes se pasaban como
    // offsets relativos y el rombo se recalculaba con una fórmula aparte.
    const tiles = this.buildSystem.getFootprintTilesAt(tx, ty);
    const hasStackSupport = Boolean(this.roomItems?.getStackTarget(tx, ty));

    this.buildSystem.drawFootprint(
      tiles,
      canPlace,
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
    // playerData.x/y es el punto de APOYO del jugador remoto (lo que emite
    // "playerMove"), no el origen de su Container: ModularPlayer deriva ese
    // origen midiendo su propio avatar cuando termine de construirse.
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
      nameEffectId: playerData.nameEffectId ?? undefined,
    });

    this.otherPlayers.add(other);
    void other.hud.refreshAvatarHead(playerData.avatar.slots);

    this.loadAvatarTextures(playerData.avatar.slots, () => {
      // Antes se armaba el hit area ACÁ MISMO con un rectángulo fijo a ojo
      // (-16,-52,32,52) apenas se creaba el container, cuando todavía no
      // tenía ni un solo sprite adentro — cada parte del avatar se ubica en
      // su propio (slot.offsetX, slot.offsetY) con origin centrado (ver
      // AvatarBuilder.ts), así que ese rectángulo adivinado solo llegaba a
      // cubrir la cabeza (arriba del origen) y se quedaba corto con el
      // cuerpo/piernas (que caen por debajo). Ahora se espera a que
      // updateAvatar termine de construir los sprites reales y se mide el
      // bounding box real del container (getBounds), así el área clickeable
      // siempre coincide con lo que se ve, sea cual sea el avatar.
      const avatarReady = other.updateAvatar(playerData.avatar.slots, playerData.avatar.skinColor);
      other.playIdle();

      avatarReady.then(() => {
        this.makeOtherPlayerClickable(other, playerData.username);
      });
    });
  }

  private makeOtherPlayerClickable(other: OtherPlayer, username: string) {
    const worldBounds = other.getBounds();
    const padding = 6;
    const hitArea = new Phaser.Geom.Rectangle(
      worldBounds.x - other.x - padding,
      worldBounds.y - other.y - padding,
      worldBounds.width + padding * 2,
      worldBounds.height + padding * 2,
    );

    other.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    if (other.input) other.input.cursor = "pointer";

    other.on(
      "pointerdown",
      (pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
        // Sin esto, el pointerdown global de la escena (this.input.on
        // "pointerdown" -> handleClickToMove) también se dispara y el
        // personaje sale a caminar hacia el tile clickeado mientras se abre
        // el menú — no queremos las dos cosas a la vez.
        event.stopPropagation();

        window.dispatchEvent(
          new CustomEvent("player:selected", {
            detail: {
              username,
              ...pointerToScreenPosition(this, pointer),
            },
          }),
        );
      },
    );
  }
}
