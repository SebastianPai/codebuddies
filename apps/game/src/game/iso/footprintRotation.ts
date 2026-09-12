/**
 * Rotación geométrica de una huella isométrica.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EL PROBLEMA QUE RESUELVE
 *
 * Un mueble rígido ocupa el MISMO número de casillas mire hacia donde mire.
 * Al girarlo 90°, un 3x1 tiene que pasar a 1x3. Eso no ocurría:
 *
 *   · `buildWorldEngineData` rellenaba las direcciones que el admin no
 *     hubiera dibujado con el rectángulo SIN rotar, así que un escritorio
 *     3x1 seguía bloqueando 3 casillas en la misma orientación al girarlo.
 *   · El editor web sincroniza direcciones ESPEJANDO (N↔S, E↔O), no
 *     rotando, de modo que EAST/WEST se quedaban con el default de 1 casilla.
 *     Un escritorio 3x1 girado a EAST bloqueaba UNA casilla de tres.
 *   · El `swapAxes` que el cliente tenía como fallback nunca se ejecutaba,
 *     porque `engineData.footprints` siempre venía relleno.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA ROTACIÓN
 *
 *     (x, y) → (maxY − y, x)        90° en el sentido de las agujas
 *
 * y el `origin` se transforma con la MISMA fórmula, porque es una casilla
 * del propio footprint. Verificación sobre 3x1 con origin (2,0):
 *
 *     NORTH  (0,0)(1,0)(2,0)  origin (2,0)   3x1
 *     EAST   (0,0)(0,1)(0,2)  origin (0,2)   1x3
 *     SOUTH  (0,0)(1,0)(2,0)  origin (0,0)   3x1   ← ancla en el extremo opuesto
 *     WEST   (0,0)(0,1)(0,2)  origin (0,0)   1x3
 *     → cuatro rotaciones devuelven exactamente el punto de partida
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ DIRECCIÓN GANA
 *
 * Una dirección dibujada a mano por el admin SIEMPRE tiene prioridad. Sólo
 * se deriva por rotación una dirección "incompleta", y la única forma
 * fiable de detectarla sin inventar banderas nuevas es el invariante
 * geométrico: **el número de casillas de un cuerpo rígido no cambia al
 * rotar**. Una dirección con menos casillas que la que más tiene es dato
 * incompleto, no una decisión de diseño.
 *
 * Eso deja intactos los items configurados correctamente (todas las
 * direcciones con el mismo número de casillas) y los genuinamente 1x1.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * OJO: este algoritmo está replicado en
 * `apps/api/src/modules/game/items/engine-data.util.ts` porque cliente y
 * servidor deben calcular EXACTAMENTE la misma huella y hoy no comparten
 * paquete. Hay un test que importa las dos implementaciones y comprueba que
 * coinciden — ver `iso/__tests__/footprint.test.mts`. Si se toca una, hay
 * que tocar la otra y el test lo detecta.
 */

export type FootprintTile = { x: number; y: number };

export type DirectionalFootprint = {
  occupied: FootprintTile[];
  origin: FootprintTile;
};

export const CARDINAL_DIRECTIONS = [
  "NORTH",
  "EAST",
  "SOUTH",
  "WEST",
] as const;

export type CardinalDirection = (typeof CARDINAL_DIRECTIONS)[number];

/** Descarta entradas no numéricas; devuelve casillas con enteros válidos. */
export function normalizeTiles(source: unknown): FootprintTile[] {
  if (!Array.isArray(source)) return [];
  return source
    .map((tile) => ({ x: Number(tile?.x), y: Number(tile?.y) }))
    .filter((tile) => Number.isInteger(tile.x) && Number.isInteger(tile.y));
}

/**
 * Regla ÚNICA de resolución del origin, idéntica en cliente y servidor:
 * el origin debe ser una de las casillas ocupadas. Si el dato guardado no
 * lo cumple, se cae de forma determinista a la primera casilla.
 *
 * No reescribe nada: sólo decide cómo LEER un dato inconsistente. Antes el
 * cliente aplicaba esta regla y el servidor usaba el valor crudo, así que
 * con un origin inválido cada uno reservaba casillas distintas.
 */
export function resolveOrigin(
  origin: unknown,
  occupied: FootprintTile[],
): FootprintTile {
  const candidate = {
    x: Number((origin as FootprintTile | undefined)?.x),
    y: Number((origin as FootprintTile | undefined)?.y),
  };

  if (
    Number.isInteger(candidate.x) &&
    Number.isInteger(candidate.y) &&
    occupied.some((tile) => tile.x === candidate.x && tile.y === candidate.y)
  ) {
    return candidate;
  }

  return occupied[0] ?? { x: 0, y: 0 };
}

export function calculateBounds(tiles: FootprintTile[]) {
  if (!tiles.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  const xs = tiles.map((t) => t.x);
  const ys = tiles.map((t) => t.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Rectángulo macizo de width×height anclado en (0,0). */
export function createRectTiles(width: number, height: number): FootprintTile[] {
  const tiles: FootprintTile[] = [];
  for (let y = 0; y < Math.max(1, height); y++) {
    for (let x = 0; x < Math.max(1, width); x++) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

/**
 * Gira la huella `steps` × 90°. `steps` se normaliza a 0-3, así que 4 giros
 * devuelven la huella original.
 *
 * El resultado se normaliza a minX = minY = 0. Eso NO cambia las casillas
 * que acaba ocupando el mueble: `toWorldTiles` las coloca relativas al
 * `origin`, que se desplaza con ellas.
 */
export function rotateFootprint(
  footprint: DirectionalFootprint,
  steps: number,
): DirectionalFootprint {
  const turns = ((Math.trunc(steps) % 4) + 4) % 4;

  let occupied = footprint.occupied.map((t) => ({ x: t.x, y: t.y }));
  let origin = { x: footprint.origin.x, y: footprint.origin.y };

  for (let i = 0; i < turns; i++) {
    const maxY = occupied.length
      ? Math.max(...occupied.map((t) => t.y))
      : origin.y;

    const turn = (t: FootprintTile) => ({ x: maxY - t.y, y: t.x });

    occupied = occupied.map(turn);
    origin = turn(origin);
  }

  if (!occupied.length) return { occupied, origin };

  const minX = Math.min(...occupied.map((t) => t.x));
  const minY = Math.min(...occupied.map((t) => t.y));

  return {
    occupied: occupied.map((t) => ({ x: t.x - minX, y: t.y - minY })),
    origin: { x: origin.x - minX, y: origin.y - minY },
  };
}

/**
 * Completa el mapa de las 4 direcciones.
 *
 * @param source        lo que haya guardado (puede ser parcial o nulo)
 * @param fallbackTiles huella a usar si no hay NINGUNA dirección dibujada
 *                      (el rectángulo footprintWidth × footprintHeight)
 */
export function resolveDirectionalFootprints(
  source: Partial<Record<string, { occupied?: unknown; origin?: unknown }>> | null | undefined,
  fallbackTiles: FootprintTile[],
): Record<CardinalDirection, DirectionalFootprint> {
  const authored = CARDINAL_DIRECTIONS.map((direction) => {
    const occupied = normalizeTiles(source?.[direction]?.occupied);
    return {
      direction,
      occupied,
      origin: resolveOrigin(source?.[direction]?.origin, occupied),
    };
  });

  // Base = la dirección con MÁS casillas (empate → la primera, NORTH).
  // Cualquier dirección con menos casillas que la base está incompleta.
  let baseIndex = 0;
  let baseCount = 0;
  authored.forEach((entry, index) => {
    if (entry.occupied.length > baseCount) {
      baseCount = entry.occupied.length;
      baseIndex = index;
    }
  });

  const base: DirectionalFootprint =
    baseCount > 0
      ? { occupied: authored[baseIndex].occupied, origin: authored[baseIndex].origin }
      : {
          occupied: fallbackTiles,
          origin: resolveOrigin(undefined, fallbackTiles),
        };

  if (baseCount === 0) baseIndex = 0;

  const result = {} as Record<CardinalDirection, DirectionalFootprint>;

  CARDINAL_DIRECTIONS.forEach((direction, index) => {
    const entry = authored[index];

    // Dibujada a mano y completa: manda tal cual.
    if (entry.occupied.length === baseCount && baseCount > 0) {
      result[direction] = { occupied: entry.occupied, origin: entry.origin };
      return;
    }

    result[direction] = rotateFootprint(base, index - baseIndex);
  });

  return result;
}
