import type IsoGrid from "./IsoGrid";

/**
 * Orden de dibujado (painter's algorithm) para una sala isométrica.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ LA FÓRMULA ANTERIOR NO PODÍA FUNCIONAR
 *
 * Era `tileY*1000 + tileX`: una regla de mapa ORTOGONAL ("fila mayor ⇒ más
 * al frente"). En isométrico la Y de pantalla de un tile es
 *
 *     screenY = (tx + ty) · tileHeight/2 + groundOffsetY
 *
 * o sea que quien manda es la ANTIDIAGONAL `tx + ty`, no `ty`. Con la regla
 * vieja, en la sala pequeña del proyecto (suelo 6..18):
 *
 *     (18,6) y (6,18) tienen la MISMA Y de pantalla  → depths 6018 y 18006
 *     (18,6) está 176 px DELANTE de (6,7)            → depths 6018 < 7006
 *
 * Una verificación exhaustiva sobre los 169 tiles de esa sala daba 5.434
 * pares mal ordenados de 27.092 (20,1 %). Con la fórmula de aquí: 0.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA REGLA
 *
 *     depth = (tx + ty)·ROW_STEP + elevation·ELEVATION_STEP + (tx − ty)
 *
 *   · `(tx + ty)` es monótona estricta en la Y de pantalla del punto de
 *     apoyo. Es LA regla; todo lo demás es desempate.
 *   · `(tx − ty)` desempata dentro de una misma línea de profundidad (dos
 *     tiles con idéntica Y de pantalla) por la X de pantalla. Estable y
 *     determinista, |tx − ty| < ROW_STEP siempre.
 *   · `elevation` ordena una pila dentro de su propia línea sin invadir la
 *     siguiente (tope de apilado 5 ⇒ 500 < 1000).
 *
 * Sin ramas por dirección, sin excepciones por objeto, sin z-index manual.
 *
 * La entrada canónica es `depthFromGroundPoint()`: recibe el PUNTO DE APOYO
 * en el suelo (pies del personaje, base del mueble) y lo convierte a tile
 * fraccionario con `IsoGrid.worldToGroundTile()`. Al pasar todos los objetos
 * del mundo por la misma función quedan en el mismo espacio de orden por
 * construcción — que es justo lo que no ocurría antes, donde los muebles y
 * el jugador usaban `ty*1000+tx` (~18.000) y la mascota y el mayordomo
 * usaban `sprite.y` (~200-600), de modo que el gato quedaba SIEMPRE detrás
 * de cualquier mueble.
 *
 * Para actores se usa el valor fraccionario, no redondeado a tile: así el
 * cruce delante/detrás ocurre exactamente donde corresponde visualmente y no
 * al saltar de casilla.
 */

/** Separación entre líneas de profundidad consecutivas. */
export const DEPTH_ROW_STEP = 1000;

/** Separación entre niveles de apilado dentro de una misma línea. */
export const DEPTH_ELEVATION_STEP = 100;

/**
 * Profundidad a partir de una coordenada de tile (puede ser fraccionaria).
 * Normalmente se llega aquí vía `depthFromGroundPoint`.
 */
export function depthFromTile(
  tileX: number,
  tileY: number,
  elevation = 0,
): number {
  return (
    (tileX + tileY) * DEPTH_ROW_STEP +
    elevation * DEPTH_ELEVATION_STEP +
    (tileX - tileY)
  );
}

/**
 * Profundidad a partir del punto de apoyo en el suelo, en coordenadas de
 * mundo. Entrada canónica para TODO lo que se dibuja en el mundo.
 */
export function depthFromGroundPoint(
  grid: IsoGrid,
  worldX: number,
  worldY: number,
  elevation = 0,
): number {
  const tile = grid.worldToGroundTile(worldX, worldY);
  // Sin grid utilizable, la Y de pantalla es la mejor aproximación monótona
  // disponible (mismo criterio, sin la resolución del desempate en X).
  if (!tile) return worldY;
  return depthFromTile(tile.x, tile.y, elevation);
}

/**
 * Cota superior de la profundidad que puede generar un mapa de este tamaño.
 * La usan las constantes de overlay (ver utils/depth.ts) para garantizar que
 * el resaltado, el HUD y la luz ambiental quedan siempre por encima del
 * mundo, en vez de depender de un número mágico elegido a ojo.
 */
export function maxWorldDepth(grid: IsoGrid): number {
  return depthFromTile(grid.width, grid.height, 16);
}
