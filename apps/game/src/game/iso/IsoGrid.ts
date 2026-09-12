import Phaser from "phaser";
import TileWalkability from "./TileWalkability";

/**
 * Autoridad geométrica única de la sala isométrica.
 *
 * ANTES de este archivo la geometría vivía repartida en tres familias de
 * fórmulas que no sabían unas de otras:
 *
 *   - `cameras.main.getWorldPoint()` + `groundLayer.worldToTileXY()` + `floor`,
 *     copiado literalmente en 8 sitios (LobbyScene ×6, BuildSystem,
 *     FurniturePlacementSystem).
 *   - `worldPos.x + tileWidth/2` + `getFurnitureAnchorY()`, copiado en 5
 *     (RoomItemsManager, BuildSystem, FurnitureSocketSystem ×2, LobbyScene).
 *   - `worldPos.y + tileHeight/2 + PLAYER_Y_OFFSET` para el jugador, con
 *     PLAYER_Y_OFFSET calibrado "a ojo" y sin relación con las otras dos.
 *
 * Cualquier cambio en una de las tres desincronizaba las otras. Todo eso pasa
 * por acá ahora.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA GEOMETRÍA, DERIVADA (no calibrada)
 *
 * En un tilemap isométrico de Phaser, `tileToWorldXY(tx,ty)` devuelve
 *
 *     P = ( layer.x + (tx−ty)·TW/2 ,  layer.y + (tx+ty)·TH/2 )
 *
 * donde TW/TH son el `tilewidth`/`tileheight` del MAPA (la rejilla lógica).
 * Pero el renderer (TilemapLayerWebGLRenderer) dibuja cada celda usando el
 * tamaño del TILESET, no el del mapa:
 *
 *     centro de la celda = P + ( TSW/2 − offset.x , TSH/2 − offset.y )
 *     con displayOrigin  = ( TSW/2 , TSH/2 )
 *     ⇒ la celda ocupa   x ∈ [P.x − offset.x, P.x − offset.x + TSW]
 *                        y ∈ [P.y − offset.y, P.y − offset.y + TSH]
 *
 * Cuando la celda del tileset es más alta que la rejilla (el caso de
 * CodeBuddies: celdas de 64×64 sobre una rejilla de 64×32), Phaser NO aplica
 * el bottom-align que sí hace Tiled. El rombo lógico del suelo son los TH
 * píxeles INFERIORES de la celda, así que su vértice inferior cae en
 *
 *     GROUND_OFFSET_Y = TSH − offset.y
 *     GROUND_OFFSET_X = (TSW − TW)/2 − offset.x
 *
 * Con los valores reales del proyecto (mapa 64×32, tileset 64×64, sin
 * `tileoffset`) eso da GROUND_OFFSET_Y = 64 y GROUND_OFFSET_X = 0 — que es
 * EXACTAMENTE lo que producían las constantes calibradas a mano que esto
 * reemplaza:
 *
 *     getFurnitureAnchorY = P.y + TH·1.5 + 16 = P.y + 64 = P.y + GROUND_OFFSET_Y
 *     TILE_VISUAL_Y_OFFSET = 16              = (TSH − TH)/2
 *
 * La diferencia es que ahora se LEEN del tileset en runtime: un tileset de
 * 64×96, o uno con `tileoffset`, sigue funcionando sin tocar código.
 */
export type IsoPoint = { x: number; y: number };

export type IsoTileCoord = { x: number; y: number };

export default class IsoGrid {
  /** Ancho/alto de la rejilla lógica (map.tilewidth / map.tileheight). */
  readonly tileWidth: number;
  readonly tileHeight: number;

  /** Ancho/alto de la celda de imagen del tileset. */
  readonly cellWidth: number;
  readonly cellHeight: number;

  /** Del punto que devuelve `tileToWorldXY` al vértice inferior del rombo. */
  readonly groundOffsetX: number;
  readonly groundOffsetY: number;

  /**
   * Píxeles que sube un sprite por cada nivel de apilado. Es la altura
   * aparente de "un nivel" en este arte isométrico: media altura de tile.
   * Vive aquí para que el ghost de construcción y el objeto ya colocado no
   * puedan usar valores distintos (antes ambos tenían un `16` literal).
   */
  readonly elevationStep: number;

  /** Tamaño del mapa en tiles. */
  readonly width: number;
  readonly height: number;

  private readonly map: Phaser.Tilemaps.Tilemap;
  private readonly layer: Phaser.Tilemaps.TilemapLayer;
  private readonly walkability: TileWalkability;

  // Vectores reutilizables: worldToTile/tileToWorld están en rutas de 60fps
  // (updateSceneDepths recorre todos los actores cada frame), así que no se
  // asigna un Vector2 nuevo por llamada.
  private readonly scratchA = new Phaser.Math.Vector2();
  private readonly scratchB = new Phaser.Math.Vector2();

  constructor(
    map: Phaser.Tilemaps.Tilemap,
    layer: Phaser.Tilemaps.TilemapLayer,
    tileset: Phaser.Tilemaps.Tileset,
    walkability: TileWalkability,
  ) {
    this.map = map;
    this.layer = layer;
    this.walkability = walkability;

    this.tileWidth = map.tileWidth;
    this.tileHeight = map.tileHeight;
    this.width = map.width;
    this.height = map.height;

    // Si el tileset no declarara tamaño (no debería pasar), se cae al de la
    // rejilla: eso reproduce el comportamiento de un tileset "normal" donde
    // la celda y el rombo coinciden.
    this.cellWidth = tileset.tileWidth || this.tileWidth;
    this.cellHeight = tileset.tileHeight || this.tileHeight;

    const offsetX = tileset.tileOffset?.x ?? 0;
    const offsetY = tileset.tileOffset?.y ?? 0;

    this.groundOffsetX = (this.cellWidth - this.tileWidth) / 2 - offsetX;
    this.groundOffsetY = this.cellHeight - offsetY;

    this.elevationStep = this.tileHeight / 2;
  }

  // ───────────────────────── tile → mundo ─────────────────────────

  /** Esquina superior izquierda de la CELDA dibujada (lo que da Phaser). */
  tileToCellOrigin(tileX: number, tileY: number): IsoPoint | null {
    const p = this.layer.tileToWorldXY(tileX, tileY, this.scratchA);
    return p ? { x: p.x, y: p.y } : null;
  }

  /**
   * Punto canónico: vértice INFERIOR del rombo del suelo. Es donde apoya
   * cualquier cosa que esté "de pie" en ese tile — un mueble con
   * `setOrigin(0.5, 1)`, los pies de un personaje, una sombra de contacto.
   * Todo lo que se dibuja en el mundo se ancla aquí, sin excepciones.
   */
  groundAnchor(tileX: number, tileY: number): IsoPoint | null {
    const p = this.layer.tileToWorldXY(tileX, tileY, this.scratchA);
    if (!p) return null;
    return {
      x: p.x + this.tileWidth / 2 + this.groundOffsetX,
      y: p.y + this.groundOffsetY,
    };
  }

  /** Centro del rombo del suelo (para resaltados y sombras centradas). */
  groundCenter(tileX: number, tileY: number): IsoPoint | null {
    const a = this.groundAnchor(tileX, tileY);
    if (!a) return null;
    return { x: a.x, y: a.y - this.tileHeight / 2 };
  }

  /** Vértice superior del rombo del suelo. */
  groundTop(tileX: number, tileY: number): IsoPoint | null {
    const a = this.groundAnchor(tileX, tileY);
    if (!a) return null;
    return { x: a.x, y: a.y - this.tileHeight };
  }

  /**
   * Los 4 vértices del rombo del suelo, en orden horario desde arriba.
   * Sirve tanto para dibujarlo (debug, footprint de construcción) como para
   * usarlo de hit area con `Phaser.Geom.Polygon.Contains` — una prueba de
   * pertenencia O(1) sobre 4 puntos, sin leer píxeles.
   */
  groundDiamond(tileX: number, tileY: number): IsoPoint[] | null {
    const a = this.groundAnchor(tileX, tileY);
    if (!a) return null;
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;
    return [
      { x: a.x, y: a.y - this.tileHeight },
      { x: a.x + hw, y: a.y - hh },
      { x: a.x, y: a.y },
      { x: a.x - hw, y: a.y - hh },
    ];
  }

  // ───────────────────────── mundo → tile ─────────────────────────

  /**
   * Inversa cruda de Phaser: interpreta (x,y) como un punto en el espacio de
   * NAVEGACIÓN, donde el rombo del tile (tx,ty) se considera centrado en
   * `P + (TW/2, TH/2)`.
   *
   * Se conserva tal cual estaba (sin corrección por groundOffset) porque la
   * prueba empírica sobre el juego real confirmó que el tile que devuelve
   * bajo el puntero es el que el jugador percibe. Toda la conversión
   * puntero→tile del juego pasa por aquí, así que si algún día hiciera falta
   * corregirla, se corrige en este único sitio.
   */
  worldToTile(worldX: number, worldY: number): IsoPoint | null {
    const t = this.layer.worldToTileXY(worldX, worldY, false, this.scratchB);
    return t ? { x: t.x, y: t.y } : null;
  }

  /** Igual que `worldToTile` pero redondeado al tile entero que lo contiene. */
  worldToTileFloored(worldX: number, worldY: number): IsoTileCoord | null {
    const t = this.worldToTile(worldX, worldY);
    return t ? { x: Math.floor(t.x), y: Math.floor(t.y) } : null;
  }

  /**
   * Inversa de `groundAnchor()`: convierte un punto de APOYO en el suelo
   * (los pies de un actor, la base de un mueble) a coordenada de tile
   * fraccionaria. Es la contraparte exacta de groundAnchor, así que
   * `worldToGroundTile(groundAnchor(tx,ty))` devuelve `(tx+0.5, ty+0.5)`.
   *
   * Es la entrada única del cálculo de profundidad: al pasar TODOS los
   * objetos (muebles, jugador, otros jugadores, mascota, mayordomo) por esta
   * misma función, quedan por construcción en el mismo espacio de orden.
   */
  worldToGroundTile(worldX: number, worldY: number): IsoPoint | null {
    return this.worldToTile(
      worldX - this.groundOffsetX,
      worldY - this.groundOffsetY + this.tileHeight / 2,
    );
  }

  /** Puntero de pantalla → punto de mundo (aplica scroll y zoom de cámara). */
  pointerToWorld(
    camera: Phaser.Cameras.Scene2D.Camera,
    pointer: Phaser.Input.Pointer,
  ): IsoPoint {
    const p = camera.getWorldPoint(pointer.x, pointer.y);
    return { x: p.x, y: p.y };
  }

  /** Puntero de pantalla → tile entero. El camino único de todo click/hover. */
  pointerToTile(
    camera: Phaser.Cameras.Scene2D.Camera,
    pointer: Phaser.Input.Pointer,
  ): IsoTileCoord | null {
    const w = this.pointerToWorld(camera, pointer);
    return this.worldToTileFloored(w.x, w.y);
  }

  // ───────────────────────── consultas ─────────────────────────

  /** ¿La coordenada cae dentro de los límites del mapa? */
  contains(tileX: number, tileY: number): boolean {
    return (
      tileX >= 0 && tileY >= 0 && tileX < this.width && tileY < this.height
    );
  }

  /**
   * ¿Hay un tile DIBUJADO en la capa de suelo?
   *
   * Responde "hay algo pintado", no "se puede caminar" — en los layouts
   * actuales la capa de suelo contiene también piezas de pared. Para
   * navegación y colisión se usa `isFloorTile()`.
   */
  hasGroundTile(tileX: number, tileY: number): boolean {
    if (!this.contains(tileX, tileY)) return false;
    const tile = this.layer.getTileAt(tileX, tileY);
    return !!tile && tile.index !== -1;
  }

  /**
   * ¿Es SUELO por el que se puede caminar?
   *
   * Hay un tile pintado Y el tileset (o el layoutJson) lo declara
   * transitable. Ver TileWalkability para el orden de prioridad y por qué
   * no hay ninguna lista de GIDs en el código.
   */
  isFloorTile(tileX: number, tileY: number): boolean {
    if (!this.contains(tileX, tileY)) return false;
    const tile = this.layer.getTileAt(tileX, tileY);
    if (!tile || tile.index === -1) return false;
    return this.walkability.isWalkableGid(tile.index);
  }

  describeWalkability(): string {
    return this.walkability.describe();
  }

  // ───────────────────────── footprints ─────────────────────────

  /**
   * Ancla de un mueble que ocupa VARIOS tiles.
   *
   * El sprite NO se ancla al tile `origin` del footprint: se ancla al
   * rectángulo envolvente en pantalla de todos los tiles que ocupa.
   *
   *   - x: centro del bounding box de suelo del footprint completo.
   *   - y: vértice inferior del tile FRONTAL, que en isométrico es el de
   *        mayor (tx + ty) — no el de mayor ty.
   *
   * Anclarlo al tile `origin` (lo que se hacía antes) desplaza el sprite
   * 32 px por cada tile de distancia entre el origin y el centro del bbox, y
   * eso es justo lo que los `spriteOffsetX/Y` por item estaban compensando a
   * mano. Con esto, `spriteOffsets` vuelve a ser lo que dice su docstring:
   * calibración fina del artwork, no corrección de geometría.
   */
  footprintAnchor(
    tiles: IsoTileCoord[],
  ): { x: number; y: number; frontTile: IsoTileCoord } | null {
    if (!tiles.length) return null;

    let minX = Infinity;
    let maxX = -Infinity;
    let frontTile = tiles[0];
    let frontRow = -Infinity;

    for (const tile of tiles) {
      const cell = this.layer.tileToWorldXY(tile.x, tile.y, this.scratchA);
      if (!cell) continue;

      const left = cell.x + this.groundOffsetX;
      if (left < minX) minX = left;
      if (left + this.tileWidth > maxX) maxX = left + this.tileWidth;

      // Tile frontal isométrico: el de mayor (tx + ty). Con empate, el de
      // mayor tx (más a la derecha en pantalla) — criterio estable.
      const row = tile.x + tile.y;
      if (row > frontRow || (row === frontRow && tile.x > frontTile.x)) {
        frontRow = row;
        frontTile = tile;
      }
    }

    if (!Number.isFinite(minX)) return null;

    const frontAnchor = this.groundAnchor(frontTile.x, frontTile.y);
    if (!frontAnchor) return null;

    return { x: (minX + maxX) / 2, y: frontAnchor.y, frontTile };
  }

  /** Resumen legible para el overlay de depuración. */
  describe(): string {
    return [
      `rejilla ${this.tileWidth}x${this.tileHeight}`,
      `celda ${this.cellWidth}x${this.cellHeight}`,
      `groundOffset (${this.groundOffsetX}, ${this.groundOffsetY})`,
      `mapa ${this.width}x${this.height} tiles`,
    ].join("  ·  ");
  }
}
