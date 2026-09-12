import Phaser from "phaser";
import { WorldObject } from "../types/WorldObject";
import {
  getDirectionalFootprint,
  getDirectionalSurface,
  toWorldTiles,
} from "./IsoFootprint";
import { applySpriteOffset } from "../utils/tileAnchor";
import { getSpriteFrameIndex, getSpriteFrameHeight, getSpriteFrameWidth } from "../utils/spriteFrames";
import { pointerToScreenPosition } from "../utils/pointerToScreenPosition";
import IsoGrid from "../iso/IsoGrid";
import { depthFromGroundPoint } from "../iso/IsoDepth";
import { FLOOR_SURFACE_DEPTH, WALL_SURFACE_DEPTH } from "../utils/depth";

/**
 * Payload de un room item tal como lo entrega el servidor (evento
 * `room:item:placed` / `room:items` / `room:surface:painted`).
 *
 * Antes cada call site desarmaba este objeto en una llamada posicional de 14
 * argumentos, repetida casi idéntica en tres sitios (LobbyScene.spawnRoomItem
 * y FurnitureSocketSystem ×2), y cada uno calculaba por su cuenta la posición
 * en pantalla. Ahora el cálculo vive sólo aquí.
 */
export type RoomItemPayload = {
  id: string;
  x: number;
  y: number;
  rotation?: number | null;
  roomId?: string | null;
  userId?: string | null;
  item: any;
  state?: any;
  elevation?: number | null;
  parentRoomItemId?: string | null;
  wallSide?: string | null;
  wallOffset?: number | null;
};

/**
 * Área de interacción de un mueble: la unión de los rombos de suelo de las
 * casillas que ocupa, en coordenadas LOCALES del sprite.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ
 *
 * `setInteractive()` sin hit area usa el RECTÁNGULO COMPLETO del frame,
 * píxeles transparentes incluidos. Los frames de los muebles llegan a medir
 * 167x240 px cuando una casilla mide 64x32: eso son 2,6 casillas de ancho
 * por 7,5 de alto de superficie clicable, casi toda aire.
 *
 * Medido sobre una sala real de producción (12 muebles, 169 casillas de
 * suelo): **101 casillas — el 60 % — quedaban "muertas"**. Clicar ahí
 * seleccionaba el mueble y `event.stopPropagation()` impedía que el evento
 * llegara a `handleClickToMove`, así que el personaje no se movía aunque la
 * casilla fuese perfectamente transitable.
 *
 * Ahora el área de interacción es la huella real sobre el suelo: se clica
 * el mueble donde el mueble está, y el aire de su PNG deja pasar el click.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * COORDENADAS
 *
 * Phaser evalúa el hit area en espacio local del objeto:
 *
 *     local = (mundo − sprite.position) + displayOrigin
 *
 * (ver InputManager.hitTest -> TransformXY, y pointWithinHitArea, que suma
 * displayOriginX/Y). Con origin (0.5, 1) eso deja el (0,0) local en la
 * esquina superior izquierda del frame. Por eso se resta
 * `sprite.x - sprite.displayOriginX` y se usa la posición del sprite YA
 * definitiva: después de setOrigin y de applySpriteOffset, para que la
 * calibración de artwork no descoloque el área.
 *
 * No hay pixel-perfect (leer alpha por cada test es caro y aquí no hace
 * falta), no hay rectángulo del PNG, y no hay ningún ajuste por mueble: la
 * misma fórmula para todos, derivada de la huella que ya usan la colisión y
 * la profundidad.
 */
type FootprintHitArea = { polygons: Phaser.Geom.Polygon[] };

const hitFootprint: Phaser.Types.Input.HitAreaCallback = (hitArea, x, y) => {
  const polygons = (hitArea as FootprintHitArea)?.polygons;
  if (!polygons) return false;

  for (const polygon of polygons) {
    if (Phaser.Geom.Polygon.Contains(polygon, x, y)) return true;
  }

  return false;
};

/**
 * Pasa los rombos de suelo (coordenadas de mundo) al espacio local del
 * sprite. Pura y sin dependencias de Phaser, para poder verificarla.
 *
 * @param diamonds rombos de cada casilla ocupada, en mundo
 * @param originX  sprite.x − sprite.displayOriginX
 * @param originY  sprite.y − sprite.displayOriginY
 * @param lift     píxeles que el sprite está elevado por apilado
 * @returns        un array plano [x0,y0,x1,y1,...] por rombo
 */
export function toLocalFootprintPolygons(
  diamonds: { x: number; y: number }[][],
  originX: number,
  originY: number,
  lift = 0,
): number[][] {
  return diamonds
    .filter((points) => points.length >= 3)
    .map((points) => {
      const flat: number[] = [];
      for (const point of points) {
        flat.push(point.x - originX, point.y - lift - originY);
      }
      return flat;
    });
}

export default class RoomItemsManager {
  private scene: Phaser.Scene;
  private grid: IsoGrid;

  private items = new Map<string, WorldObject>();

  // Sprite del mueble actualmente seleccionado (clic simple, sin abrir
  // modal) — solo uno a la vez, se destiñe automáticamente al seleccionar
  // otro o al deseleccionar (Escape / clic en otro lado / cerrar el menú).
  private selectedId: string | null = null;

  constructor(scene: Phaser.Scene, grid: IsoGrid) {
    this.scene = scene;
    this.grid = grid;
  }

  private get elevationStep() {
    return this.grid.elevationStep;
  }

  /**
   * Tiles que ocupa un item en coordenadas de mundo, resolviendo su
   * footprint por dirección y su `origin`.
   */
  private occupiedTilesOf(
    tileX: number,
    tileY: number,
    worldData: any,
    rotation: number,
  ) {
    return toWorldTiles(
      tileX,
      tileY,
      getDirectionalFootprint(worldData, rotation),
    );
  }

  /**
   * Punto de apoyo del sprite: el ancla del footprint COMPLETO, no la del
   * tile `origin`. Ver IsoGrid.footprintAnchor para por qué esa distinción
   * importa en muebles de varios tiles.
   */
  private groundAnchorFor(
    tileX: number,
    tileY: number,
    worldData: any,
    rotation: number,
  ) {
    const tiles = this.occupiedTilesOf(tileX, tileY, worldData, rotation);
    return (
      this.grid.footprintAnchor(tiles) ?? {
        ...(this.grid.groundAnchor(tileX, tileY) ?? { x: 0, y: 0 }),
        frontTile: { x: tileX, y: tileY },
      }
    );
  }

  addItem(payload: RoomItemPayload, texture: string) {
    if (!this.scene.textures.exists(texture)) {
      console.error("❌ TEXTURA NO CARGADA", texture);
      return null;
    }

    const id = payload.id;
    const tileX = payload.x;
    const tileY = payload.y;
    const rotation = payload.rotation ?? 0;
    const elevation = payload.elevation ?? 0;
    const parentRoomItemId = payload.parentRoomItemId ?? null;
    const wallSide = payload.wallSide ?? null;
    const wallOffset = payload.wallOffset ?? null;

    const itemData = { ...payload.item, roomItemState: payload.state };
    const worldData = itemData?.worldData;
    const state = payload.state ?? {};
    const isSurface =
      state?.surface || worldData?.kind === "FLOOR" || worldData?.kind === "WALL";

    const tex = this.scene.textures.get(texture);
    const frameWidth = getSpriteFrameWidth(worldData);
    const frameHeight = getSpriteFrameHeight(worldData);

    let frameName = "__BASE";

    // Spritesheet horizontal de 1/2/4 caras: el frame se envuelve al número
    // de caras (worldData.directions), no a la rotación cruda 0-3.
    if (!isSurface && frameWidth && frameHeight && rotation >= 0 && rotation <= 3) {
      const frameIndex = getSpriteFrameIndex(rotation, worldData);
      frameName = `${texture}-room-${frameIndex}`;

      if (!tex.has(frameName)) {
        tex.add(frameName, 0, frameWidth * frameIndex, 0, frameWidth, frameHeight);
      }
    }

    const surfaceSprites = isSurface
      ? this.createSurfaceSprites(texture, tileX, tileY, itemData, wallSide)
      : [];

    const anchor = this.groundAnchorFor(tileX, tileY, worldData, rotation);

    const sprite =
      surfaceSprites[0] ??
      this.scene.add.sprite(
        anchor.x,
        anchor.y - elevation * this.elevationStep,
        texture,
        frameName,
      );

    // El hit area se aplica MÁS ABAJO, no aquí: necesita la posición y el
    // origin definitivos del sprite (setOrigin + applySpriteOffset) para
    // convertir los rombos de suelo al espacio local correcto.
    sprite.setOrigin(0.5, 1);

    // Calibración visual por-item (WorldItemData.spriteOffsetX/Y): corre solo
    // el sprite respecto de su ancla, no el footprint/profundidad/colisión.
    // Las superficies (FLOOR/WALL) se pegan a la tile y no se calibran.
    if (!isSurface) {
      applySpriteOffset(sprite, worldData, rotation);
    }

    const worldObject: WorldObject = {
      roomItemId: id,
      roomId: payload.roomId ?? "",
      ownerId: payload.userId ?? "",
      rotation,
      tileX,
      tileY,
      elevation,
      parentRoomItemId,
      wallSide,
      wallOffset,
      state,
      sprite,
      surfaceSprites,
      item: itemData,
    };

    this.items.set(id, worldObject);
    this.invalidateOccupancy();

    if (!isSurface) {
      this.updateSingleItemDepth(worldObject);
      this.applyFootprintHitArea(worldObject);
      // Estado inicial (ej: la TV ya estaba encendida al entrar a la sala).
      this.applyItemState(id);
    }

    if (!isSurface) {
      sprite.on(
        "pointerdown",
        (
          pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          // Si hay un mueble en mano (modo construcción), dejamos que el
          // pointerdown suba hasta FurniturePlacementSystem para que lo
          // coloque encima de este item en vez de seleccionarlo.
          if ((this.scene as any).buildSystem?.getCurrentItem?.()) {
            return;
          }

          // Sin esto, el pointerdown global de la escena (this.input.on
          // "pointerdown" -> handleClickToMove) también se dispara y el
          // personaje sale a caminar hacia el mueble clickeado a la vez que
          // se selecciona.
          event.stopPropagation();

          this.selectItem(id);

          window.dispatchEvent(
            new CustomEvent("room:item:selected", {
              detail: {
                furniture: worldObject,
                ...pointerToScreenPosition(this.scene, pointer),
              },
            }),
          );
        },
      );
    }

    return sprite;
  }

  /**
   * Recoloca el sprite de un item ya existente tras moverse o rotar.
   * Antes esto estaba duplicado y escrito a mano en
   * FurnitureSocketSystem.handleItemMoved y handleItemRotated, cada uno con
   * su propia copia de la fórmula de anclaje.
   */
  repositionItem(id: string) {
    const worldObject = this.items.get(id);
    if (!worldObject) return;

    const worldData = worldObject.item?.worldData;
    const isSurface =
      worldObject.state?.surface ||
      worldData?.kind === "FLOOR" ||
      worldData?.kind === "WALL";

    if (isSurface) return;

    const anchor = this.groundAnchorFor(
      worldObject.tileX,
      worldObject.tileY,
      worldData,
      worldObject.rotation,
    );

    worldObject.sprite.setPosition(
      anchor.x,
      anchor.y - worldObject.elevation * this.elevationStep,
    );

    // El offset de artwork es por dirección, así que rotar puede cambiarlo.
    applySpriteOffset(worldObject.sprite, worldData, worldObject.rotation);

    this.updateSingleItemDepth(worldObject);
    // Mover o rotar cambia qué casillas ocupa (y dónde está el sprite), así
    // que el área de interacción tiene que recalcularse con ellas.
    this.applyFootprintHitArea(worldObject);
  }

  /**
   * Define el área clicable del mueble como la unión de los rombos de suelo
   * de las casillas que ocupa.
   *
   * Reutiliza `occupiedTilesOf()` — la MISMA fuente que usan la colisión
   * (`computeOccupancyEntries`) y la profundidad (`getDepthAnchor`) — así
   * que no hay una segunda definición de la huella que pueda desviarse, y
   * respeta la rotación actual sin nada específico por mueble.
   */
  private applyFootprintHitArea(worldObject: WorldObject) {
    const sprite = worldObject.sprite;

    const tiles = this.occupiedTilesOf(
      worldObject.tileX,
      worldObject.tileY,
      worldObject.item?.worldData,
      worldObject.rotation,
    );

    const diamonds = tiles
      .map((tile) => this.grid.groundDiamond(tile.x, tile.y))
      .filter((diamond): diamond is { x: number; y: number }[] => !!diamond);

    const flats = toLocalFootprintPolygons(
      diamonds,
      sprite.x - sprite.displayOriginX,
      sprite.y - sprite.displayOriginY,
      worldObject.elevation * this.elevationStep,
    );

    if (!flats.length) {
      // Sin huella utilizable no se inventa un área: mejor no clicable que
      // clicable donde no toca.
      sprite.disableInteractive();
      return;
    }

    const polygons = flats.map((flat) => new Phaser.Geom.Polygon(flat));

    sprite.setInteractive({
      hitArea: { polygons } satisfies FootprintHitArea,
      hitAreaCallback: hitFootprint,
      useHandCursor: true,
    });
  }

  // Solo resalta el sprite (tint); no abre ningún modal por sí solo — quién
  // reacciona a "room:item:selected" decide qué UI mostrar.
  selectItem(id: string) {
    if (this.selectedId === id) return;

    this.clearSelection();

    const worldObject = this.items.get(id);
    if (!worldObject) return;

    worldObject.sprite.setTint(0x8ecbff);
    this.selectedId = id;
  }

  // Devuelve true si realmente había algo seleccionado (para que quien
  // llama solo notifique a React si hubo un cambio real).
  clearSelection(): boolean {
    if (!this.selectedId) return false;

    const worldObject = this.items.get(this.selectedId);
    worldObject?.sprite.clearTint();
    this.selectedId = null;

    return true;
  }

  private createSurfaceSprites(
    texture: string,
    tileX: number,
    tileY: number,
    itemData: any,
    wallSide: string | null,
  ) {
    const sprites: Phaser.GameObjects.Sprite[] = [];

    const state = itemData?.roomItemState ?? itemData?.state ?? {};
    const width = Math.max(1, Number(state.width ?? itemData?.worldData?.width ?? 1));
    const height = Math.max(1, Number(state.height ?? itemData?.worldData?.height ?? 1));
    const kind = itemData?.worldData?.kind;

    for (let iy = 0; iy < height; iy++) {
      for (let ix = 0; ix < width; ix++) {
        const anchor = this.grid.groundAnchor(tileX + ix, tileY + iy);
        if (!anchor) continue;

        const sprite = this.scene.add.sprite(anchor.x, anchor.y, texture);

        sprite.setOrigin(0.5, 1);

        if (kind === "FLOOR") {
          sprite.setDisplaySize(this.grid.tileWidth, this.grid.tileHeight);
        }

        sprite.setAlpha(0.96);

        if (kind === "WALL" || wallSide) {
          sprite.setY(sprite.y - this.grid.tileHeight / 2);
          sprite.setDepth(WALL_SURFACE_DEPTH);
        } else {
          sprite.setDepth(FLOOR_SURFACE_DEPTH);
        }

        sprites.push(sprite);
      }
    }

    return sprites;
  }

  // Refleja worldObject.state visualmente. Hoy: state.on -> luz cálida de
  // "encendido" (PointLight, sin asset).
  applyItemState(id: string) {
    const worldObject = this.items.get(id);
    if (!worldObject) return;

    const on = !!worldObject.state?.on;
    const sprite = worldObject.sprite;
    const glowX = sprite.x;
    const glowY = sprite.y - sprite.displayHeight * 0.5;

    if (on) {
      const radius = Math.max(48, sprite.displayWidth * 0.9);
      if (!worldObject.glowLight) {
        worldObject.glowLight = this.scene.add.pointlight(
          glowX,
          glowY,
          0xffe6b0,
          radius,
          0.9,
          0.05,
        );
      } else {
        worldObject.glowLight.setPosition(glowX, glowY);
      }
      worldObject.glowLight.setDepth(sprite.depth - 1);
    } else if (worldObject.glowLight) {
      worldObject.glowLight.destroy();
      worldObject.glowLight = null;
    }
  }

  removeItem(id: string) {
    const worldObject = this.items.get(id);

    if (!worldObject) {
      return;
    }

    worldObject.glowLight?.destroy();
    worldObject.surfaceSprites?.forEach((sprite) => sprite.destroy());

    if (!worldObject.surfaceSprites?.includes(worldObject.sprite)) {
      worldObject.sprite.destroy();
    }

    this.items.delete(id);
    this.invalidateOccupancy();

    if (this.selectedId === id) this.selectedId = null;
  }

  getItem(id: string) {
    return this.items.get(id);
  }

  getAll() {
    return [...this.items.values()];
  }

  getItemsAt(tileX: number, tileY: number) {
    return this.getAll().filter((item) =>
      this.occupiedTilesOf(
        item.tileX,
        item.tileY,
        item.item?.worldData,
        item.rotation,
      ).some((tile) => tile.x === tileX && tile.y === tileY),
    );
  }

  // Antes getBlockingTiles()/getOccupiedTiles() recorrían TODOS los items en
  // cada llamada — y se llaman en rutas calientes: cada pixel que cruza el
  // mouse sobre un tile nuevo (updateHoverHighlight → isWalkable) y cada
  // frame en build mode (updateBuildPreviewTint → canPlace). El resultado
  // solo cambia cuando algo se coloca/mueve/rota/elimina, así que se cachea.
  private occupancyCache: { blocking: Set<string>; occupied: Set<string> } | null = null;

  /**
   * Aviso de que la ocupación cambió. Lo usa la navegación para mantener su
   * rejilla al día.
   *
   * Es estructural a propósito: `invalidateOccupancy()` es el punto por el
   * que pasan TODOS los cambios de ocupación (alta, baja, mover, rotar,
   * vaciar), así que nadie puede olvidarse de avisar. Antes la colisión
   * dependía de que alguien se acordara de llamar a `refreshPathfinding()`
   * desde fuera, y en la carga inicial ese aviso vivía dentro de un único
   * `.then()` global: si la textura de UN mueble fallaba, la promesa se
   * rechazaba, el aviso no llegaba nunca y la sala entera se quedaba SIN
   * obstáculos.
   */
  private occupancyListener?: () => void;

  setOccupancyListener(listener: (() => void) | undefined) {
    this.occupancyListener = listener;
  }

  invalidateOccupancy() {
    this.occupancyCache = null;
    this.occupancyListener?.();
  }

  private computeOccupancyEntries(excludeId?: string) {
    const blocking = new Set<string>();
    const occupied = new Set<string>();

    this.items.forEach((worldObject, id) => {
      if (id === excludeId) return;

      const worldData = worldObject.item?.worldData;
      const isWallObject =
        worldObject.wallSide ||
        worldData?.placementType === "WALL" ||
        worldData?.kind === "FLOOR" ||
        worldData?.kind === "WALL";

      if (isWallObject) return;

      const blocksMovement =
        worldData?.isCollidable === true && !worldData?.walkable;

      for (const tile of this.occupiedTilesOf(
        worldObject.tileX,
        worldObject.tileY,
        worldData,
        worldObject.rotation,
      )) {
        const key = `${tile.x},${tile.y}`;
        occupied.add(key);
        if (blocksMovement) blocking.add(key);
      }
    });

    return { blocking, occupied };
  }

  private computeOccupancy() {
    this.occupancyCache = this.computeOccupancyEntries();
    return this.occupancyCache;
  }

  // Variante sin caché para el ghost de "mover un mueble ya colocado": el
  // mueble que se está moviendo no puede contarse como ocupando SUS PROPIAS
  // tiles, si no canPlace() siempre lo vería bloqueado por sí mismo.
  getOccupancyExcluding(excludeId: string): { blocking: Set<string>; occupied: Set<string> } {
    return this.computeOccupancyEntries(excludeId);
  }

  // Tiles intransitables para el pathfinding (solo items colisionables).
  getBlockingTiles(): Set<string> {
    return (this.occupancyCache ?? this.computeOccupancy()).blocking;
  }

  // Tiles ocupados por CUALQUIER item colocado, sea o no colisionable.
  // PlacementValidator.canPlace() necesita esto para no permitir apilar
  // copias ilimitadas de un item no colisionable en el mismo lugar.
  getOccupiedTiles(): Set<string> {
    return (this.occupancyCache ?? this.computeOccupancy()).occupied;
  }

  /**
   * Punto de apoyo que decide la profundidad de un item.
   *
   * Para un item apilado (parentRoomItemId) se hereda el del item base
   * (recursivo): un item 1x1 apoyado sobre la tile trasera de una mesa
   * grande debe quedar en la MISMA línea de profundidad que la mesa, y que
   * sólo la elevación decida el orden dentro de esa línea. Si se calculara
   * desde su propia tile quedaría detrás de la mesa aunque visualmente esté
   * encima.
   *
   * Para el resto, es el ancla del footprint completo, cuyo tile frontal es
   * el de mayor (tx + ty) — el frontal isométrico real. Antes se tomaba el
   * de mayor ty, que coincide en footprints rectos pero no en forma de L.
   */
  private getDepthAnchor(worldObject: WorldObject): { x: number; y: number } {
    const parentId = worldObject.parentRoomItemId;
    if (parentId) {
      const parent = this.items.get(parentId);
      if (parent) return this.getDepthAnchor(parent);
    }

    const anchor = this.groundAnchorFor(
      worldObject.tileX,
      worldObject.tileY,
      worldObject.item?.worldData,
      worldObject.rotation,
    );

    // La X del depth es la del TILE FRONTAL, no el centro del bounding box
    // del footprint: el desempate dentro de una línea de profundidad se hace
    // por la X de pantalla de ese tile.
    const front = this.grid.groundAnchor(
      anchor.frontTile.x,
      anchor.frontTile.y,
    );

    return front ?? { x: anchor.x, y: anchor.y };
  }

  private updateSingleItemDepth(worldObject: WorldObject) {
    const worldData = worldObject.item?.worldData;
    const isSurface =
      worldObject.state?.surface ||
      worldData?.kind === "FLOOR" ||
      worldData?.kind === "WALL";

    if (isSurface || worldObject.wallSide) return;

    const anchor = this.getDepthAnchor(worldObject);

    worldObject.sprite.setDepth(
      depthFromGroundPoint(this.grid, anchor.x, anchor.y, worldObject.elevation),
    );
  }

  updateItemDepth(id: string) {
    const worldObject = this.items.get(id);
    if (worldObject) this.updateSingleItemDepth(worldObject);
  }

  updateDepths() {
    this.items.forEach((worldObject) => this.updateSingleItemDepth(worldObject));
  }

  getStackTarget(tileX: number, tileY: number) {
    return this.getAll()
      .filter((item) => {
        if (!item.item?.worldData?.allowsStacking) return false;
        const surface = getDirectionalSurface(item.item.worldData, item.rotation);
        const tiles = surface.occupied.length
          ? toWorldTiles(item.tileX, item.tileY, surface)
          : this.occupiedTilesOf(
              item.tileX,
              item.tileY,
              item.item.worldData,
              item.rotation,
            );
        return tiles.some((tile) => tile.x === tileX && tile.y === tileY);
      })
      .sort((a, b) => b.elevation - a.elevation)[0];
  }

  getHighestItemAt(tileX: number, tileY: number) {
    return this.getItemsAt(tileX, tileY).sort(
      (a, b) => b.elevation - a.elevation,
    )[0];
  }

  clear() {
    this.items.forEach((item) => {
      item.glowLight?.destroy();
      item.surfaceSprites?.forEach((sprite) => sprite.destroy());
      if (!item.surfaceSprites?.includes(item.sprite)) {
        item.sprite.destroy();
      }
    });

    this.items.clear();
    this.invalidateOccupancy();
    this.selectedId = null;
  }
}
