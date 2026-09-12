import EasyStar from "easystarjs";
import type IsoGrid from "./IsoGrid";

/**
 * Autoridad ÚNICA de navegación y colisión de la sala.
 *
 * Todo lo que se mueva por el mundo — jugador, otros jugadores, mascota,
 * mayordomo y los NPC que vengan — pregunta aquí si una casilla es
 * transitable y pide aquí sus rutas. No hay un segundo sistema de colisión:
 * el comportamiento (seguir, deambular, ir a un click) es de cada actor, la
 * geometría transitable es de este objeto.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ ARREGLA RESPECTO DE LO ANTERIOR
 *
 * 1. CORNER CUTTING. Antes se llamaba a `enableDiagonals()` sin
 *    `disableCornerCutting()`. Con el corner cutting activo, EasyStar
 *    permite el paso diagonal aunque uno de los dos vecinos ortogonales
 *    esté bloqueado: al bordear un mueble, la ruta ROZA su esquina. En
 *    proyección isométrica ese paso diagonal es un desplazamiento
 *    horizontal o vertical PURO en pantalla, y la interpolación en línea
 *    recta pasa justo por el vértice del tile bloqueado, así que el sprite
 *    del personaje atraviesa visualmente el mueble.
 *
 *    El comentario que justificaba dejarlo activo decía que las "puntas del
 *    rombo" sólo son alcanzables en diagonal. Se comprobó por flood-fill
 *    sobre los dos mapas reales: la única casilla que el corner cutting
 *    hace alcanzable es una pieza de pared mal colocada en la capa de
 *    suelo, que además deja de ser caminable en cuanto se declara la
 *    caminabilidad (ver TileWalkability).
 *
 * 2. RECONSTRUCCIÓN COMPLETA EN CADA CAMBIO. Antes, cualquier mueble que se
 *    colocara, moviera, rotara o borrara ejecutaba `new EasyStar.js()` +
 *    reconstrucción de la rejilla entera + `currentPath = []`. Eso
 *    (a) descartaba las búsquedas en vuelo, (b) DETENÍA EN SECO a todos los
 *    jugadores de la sala, y (c) en la carga inicial se repetía una vez por
 *    cada mueble.
 *
 *    Aquí la instancia de EasyStar es estable y la rejilla se muta sólo en
 *    las celdas que cambian. EasyStar guarda la REFERENCIA del array, así
 *    que mutarlo basta; los costes de los dos valores posibles se siembran
 *    en el constructor para no tener que volver a llamar a setGrid().
 */

const WALKABLE = 0;
const BLOCKED = 1;

export type NavTile = { x: number; y: number };

export default class NavGrid {
  private readonly iso: IsoGrid;
  private readonly easystar: EasyStar.js;

  /** Rejilla de colisión viva. EasyStar conserva esta misma referencia. */
  private readonly grid: number[][];

  /** Suelo transitable ignorando muebles. Cambia al pintar el suelo. */
  private readonly terrain: boolean[][];

  /** Casillas bloqueadas por muebles, para poder difear el cambio. */
  private blocked = new Set<string>();

  constructor(iso: IsoGrid) {
    this.iso = iso;

    this.terrain = [];
    this.grid = [];

    for (let y = 0; y < iso.height; y++) {
      const terrainRow: boolean[] = [];
      const gridRow: number[] = [];
      for (let x = 0; x < iso.width; x++) {
        const walkable = iso.isFloorTile(x, y);
        terrainRow.push(walkable);
        gridRow.push(walkable ? WALKABLE : BLOCKED);
      }
      this.terrain.push(terrainRow);
      this.grid.push(gridRow);
    }

    this.easystar = new EasyStar.js();
    this.easystar.setGrid(this.grid);
    this.easystar.setAcceptableTiles([WALKABLE]);
    this.easystar.enableDiagonals();
    this.easystar.disableCornerCutting();

    // getTileCost() lee costMap[valor] sin valor por defecto: si una sala
    // arranca sin ninguna casilla bloqueada, el 1 no estaría en el mapa de
    // costes y al bloquear un tile más tarde el coste saldría undefined.
    // Sembrando los dos valores, mutar la rejilla en caliente es seguro sin
    // volver a llamar a setGrid().
    this.easystar.setTileCost(WALKABLE, 1);
    this.easystar.setTileCost(BLOCKED, 1);
  }

  /** Avanza las búsquedas en curso. Se llama una vez por frame. */
  update() {
    this.easystar.calculate();
  }

  // ───────────────────────── consultas ─────────────────────────

  inBounds(tx: number, ty: number) {
    return this.iso.contains(tx, ty);
  }

  /** ¿Suelo transitable y sin mueble bloqueante encima? */
  isWalkable(tx: number, ty: number): boolean {
    if (!this.inBounds(tx, ty)) return false;
    return this.grid[ty][tx] === WALKABLE;
  }

  /** ¿Es suelo, ignorando los muebles? */
  isTerrainWalkable(tx: number, ty: number): boolean {
    if (!this.inBounds(tx, ty)) return false;
    return this.terrain[ty][tx];
  }

  /** ¿Alguna de estas casillas está bloqueada ahora mismo? */
  anyBlocked(tiles: NavTile[]): boolean {
    return tiles.some((tile) => !this.isWalkable(tile.x, tile.y));
  }

  // ───────────────────────── actualización ─────────────────────────

  /**
   * Aplica el conjunto de casillas ocupadas por muebles bloqueantes.
   * Sólo toca las celdas que realmente cambian y devuelve cuáles fueron,
   * para que quien llama decida si alguna ruta activa se ve afectada.
   */
  setBlockedTiles(next: Set<string>): NavTile[] {
    const changed: NavTile[] = [];

    const apply = (key: string, blocked: boolean) => {
      const [rawX, rawY] = key.split(",");
      const x = Number(rawX);
      const y = Number(rawY);
      if (!this.inBounds(x, y)) return;

      const value = blocked || !this.terrain[y][x] ? BLOCKED : WALKABLE;
      if (this.grid[y][x] === value) return;

      this.grid[y][x] = value;
      changed.push({ x, y });
    };

    for (const key of this.blocked) {
      if (!next.has(key)) apply(key, false);
    }
    for (const key of next) {
      if (!this.blocked.has(key)) apply(key, true);
    }

    this.blocked = new Set(next);

    return changed;
  }

  /**
   * Recalcula el terreno de una casilla (pintar un tile de suelo puede
   * volverla transitable o dejar de serlo). No toca los muebles.
   */
  refreshTerrainAt(tx: number, ty: number) {
    if (!this.inBounds(tx, ty)) return;
    const walkable = this.iso.isFloorTile(tx, ty);
    this.terrain[ty][tx] = walkable;
    const blockedByItem = this.blocked.has(`${tx},${ty}`);
    this.grid[ty][tx] = walkable && !blockedByItem ? WALKABLE : BLOCKED;
  }

  // ───────────────────────── rutas ─────────────────────────

  /**
   * Pide una ruta. Devuelve el id de la búsqueda para poder cancelarla si
   * queda obsoleta (antes se descartaba creando una instancia nueva de
   * EasyStar, lo que además tiraba las búsquedas de todos los demás).
   */
  findPath(
    from: NavTile,
    to: NavTile,
    callback: (path: NavTile[] | null) => void,
  ): number | null {
    if (!this.inBounds(from.x, from.y) || !this.inBounds(to.x, to.y)) {
      callback(null);
      return null;
    }
    return this.easystar.findPath(from.x, from.y, to.x, to.y, callback);
  }

  cancelPath(instanceId: number | null) {
    if (instanceId === null) return;
    this.easystar.cancelPath(instanceId);
  }

  /**
   * Casilla transitable más cercana a (tx, ty), en anillos crecientes.
   *
   * Sirve para desatascar a un actor que quedó dentro de una huella que se
   * bloqueó bajo sus pies. Devuelve un DESTINO al que caminar, no una
   * posición a la que saltar: quien llama debe ir andando hasta ahí para no
   * teletransportar al personaje.
   */
  nearestWalkable(tx: number, ty: number, maxRadius = 6): NavTile | null {
    if (this.isWalkable(tx, ty)) return { x: tx, y: ty };

    for (let r = 1; r <= maxRadius; r++) {
      let best: NavTile | null = null;
      let bestDistance = Infinity;

      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          // Sólo el borde del anillo: el interior ya se miró en r-1.
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;

          const nx = tx + dx;
          const ny = ty + dy;
          if (!this.isWalkable(nx, ny)) continue;

          const distance = dx * dx + dy * dy;
          if (distance < bestDistance) {
            bestDistance = distance;
            best = { x: nx, y: ny };
          }
        }
      }

      if (best) return best;
    }

    return null;
  }

  /** Nº de casillas transitables. Para diagnóstico y para los tests. */
  walkableCount(): number {
    let n = 0;
    for (let y = 0; y < this.iso.height; y++) {
      for (let x = 0; x < this.iso.width; x++) {
        if (this.grid[y][x] === WALKABLE) n++;
      }
    }
    return n;
  }
}
