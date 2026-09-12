import type Phaser from "phaser";

/**
 * ¿Qué tiles del tileset son SUELO por el que se puede caminar?
 *
 * Hasta ahora el juego confundía dos cosas distintas:
 *
 *     "hay un tile pintado en la capa de suelo"   ≠   "es suelo caminable"
 *
 * `isWalkable()` solo comprobaba `tile.index !== -1`, así que cualquier cosa
 * dibujada en la capa de suelo era transitable. En los layouts reales esa
 * capa contiene también piezas de PARED del mismo tileset: en `grande-v1`
 * hay 6 celdas de una pieza de muro y 1 remate de esquina metidos ahí, y el
 * jugador podía caminar sobre los siete.
 *
 * La caminabilidad es una propiedad del TILESET (las dos salas comparten
 * `tiles3.png`), no de cada sala. Por eso no hay ninguna lista de GIDs en el
 * código: se declara en los datos, con este orden de prioridad.
 *
 *   1. Propiedad `walkable` del tile en Tiled  (lo canónico)
 *      En Tiled: seleccionar el tile en el tileset → Propiedades
 *      personalizadas → añadir `walkable` (bool). Phaser la expone vía
 *      `tileset.getTileProperties(gid)` sin coste extra.
 *
 *   2. Declaración en `__codebuddies.tiles` del layoutJson  (puente)
 *      Mientras el tileset no tenga las propiedades puestas:
 *
 *        "__codebuddies": {
 *          "tiles": { "blockedGids": [27, 14] }
 *        }
 *
 *      o al revés, en modo lista blanca:
 *
 *        "__codebuddies": {
 *          "tiles": { "walkableGids": [13] }
 *        }
 *
 *      Con `walkableGids` declarado, lo que NO esté en la lista no es suelo.
 *
 *   3. Sin ninguna declaración → todo tile pintado es caminable, que es el
 *      comportamiento histórico. Así ninguna sala existente cambia de
 *      conducta hasta que sus datos digan otra cosa.
 */
export type TileWalkabilityDeclaration = {
  /** Lista blanca: si está, sólo estos GIDs son suelo. */
  walkableGids?: number[];
  /** Lista negra: estos GIDs nunca son suelo (gana sobre walkableGids). */
  blockedGids?: number[];
};

export function parseWalkabilityDeclaration(
  source: unknown,
): TileWalkabilityDeclaration {
  const raw = (source ?? {}) as Record<string, unknown>;

  const toGidList = (value: unknown): number[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const gids = value
      .map((entry) => Math.trunc(Number(entry)))
      .filter((gid) => Number.isFinite(gid) && gid > 0);
    return gids.length ? gids : undefined;
  };

  return {
    walkableGids: toGidList(raw.walkableGids),
    blockedGids: toGidList(raw.blockedGids),
  };
}

export default class TileWalkability {
  private readonly tilesets: Phaser.Tilemaps.Tileset[];
  private readonly walkableGids?: Set<number>;
  private readonly blockedGids: Set<number>;

  // El resultado por GID no cambia en toda la vida de la sala y se consulta
  // en rutas calientes (reconstrucción de la rejilla de navegación), así que
  // se memoiza.
  private readonly cache = new Map<number, boolean>();

  constructor(
    tilesets: Phaser.Tilemaps.Tileset[],
    declaration: TileWalkabilityDeclaration = {},
  ) {
    this.tilesets = tilesets;
    this.walkableGids = declaration.walkableGids
      ? new Set(declaration.walkableGids)
      : undefined;
    this.blockedGids = new Set(declaration.blockedGids ?? []);
  }

  /** ¿Hay alguna declaración, o estamos en el modo histórico "todo vale"? */
  hasDeclaration(): boolean {
    return (
      this.walkableGids !== undefined ||
      this.blockedGids.size > 0 ||
      this.tilesets.some((tileset) =>
        Object.values(tileset.tileProperties ?? {}).some(
          (props) => typeof (props as { walkable?: unknown })?.walkable === "boolean",
        ),
      )
    );
  }

  isWalkableGid(gid: number): boolean {
    if (gid <= 0) return false;

    const cached = this.cache.get(gid);
    if (cached !== undefined) return cached;

    const result = this.resolve(gid);
    this.cache.set(gid, result);
    return result;
  }

  private resolve(gid: number): boolean {
    // 1. Propiedad del tileset de Tiled.
    for (const tileset of this.tilesets) {
      const props = tileset.getTileProperties(gid) as
        | { walkable?: unknown }
        | null
        | undefined;
      if (props && typeof props.walkable === "boolean") {
        return props.walkable;
      }
    }

    // 2. Declaración del layoutJson. La lista negra gana.
    if (this.blockedGids.has(gid)) return false;
    if (this.walkableGids) return this.walkableGids.has(gid);

    // 3. Comportamiento histórico.
    return true;
  }

  describe(): string {
    if (!this.hasDeclaration()) return "caminabilidad: sin declarar (todo suelo)";
    const parts: string[] = [];
    if (this.walkableGids) parts.push(`walkable=[${[...this.walkableGids].join(",")}]`);
    if (this.blockedGids.size) parts.push(`blocked=[${[...this.blockedGids].join(",")}]`);
    if (!parts.length) parts.push("propiedades del tileset");
    return `caminabilidad: ${parts.join(" ")}`;
  }
}
