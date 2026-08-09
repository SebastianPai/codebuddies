/**
 * Punto visual "correcto" de una tile isométrica. TILE_VISUAL_Y_OFFSET es el
 * único número a tunear para mover cursor + muebles + texturas juntos — lo
 * importan tanto getFurnitureAnchorY como LobbyScene.updateHoverHighlight
 * (el cuadro amarillo), así que ya no se puede desincronizar entre ambos.
 *
 * El cursor es un Phaser.GameObjects.Polygon: Phaser posiciona estos shapes
 * por el CENTRO de su bounding box (no por su esquina/vértice superior), así
 * que su fórmula ya es `worldPos.y + tileHeight + TILE_VISUAL_Y_OFFSET` para
 * ese centro. Los sprites de muebles (origin 0.5, 1 — anclados por su base)
 * necesitan el VÉRTICE INFERIOR del mismo rombo, que está a +tileHeight/2 de
 * ese centro. Antes de este archivo, BuildSystem/FurnitureSocketSystem/
 * LobbyScene calculaban la Y del mueble como `worldPos.y + tileHeight` a
 * secas — le faltaba tanto ese +tileHeight/2 (para llegar al vértice
 * inferior en vez de al centro) como el TILE_VISUAL_Y_OFFSET, y por eso el
 * mueble quedaba visualmente más arriba que el tile que el cursor marca.
 *
 * Si al probarlo en el navegador el mueble todavía no queda exactamente
 * sobre el cursor, ajustar solo TILE_VISUAL_Y_OFFSET acá (un valor más alto
 * mueve todo hacia abajo en pantalla) — no volver a tocar los +tileHeight
 * de cada archivo.
 */
export const TILE_VISUAL_Y_OFFSET = 16;

export function getFurnitureAnchorY(worldPosY: number, tileHeight: number) {
  return worldPosY + tileHeight * 1.5 + TILE_VISUAL_Y_OFFSET;
}

/**
 * Vértice superior "desplazado" del rombo de una tile, para dibujar el
 * footprint (BuildSystem.drawFootprint — el rombo verde/rojo/azul que marca
 * qué tiles va a ocupar el mueble). Ese rombo se dibuja con Graphics.
 * fillPoints usando puntos absolutos (no setPosition), así que a diferencia
 * del cursor (un Polygon con auto-centrado) su `worldPos.y` de base SÍ era
 * el vértice superior puro, sin TILE_VISUAL_Y_OFFSET — por eso quedaba
 * desalineado del cursor/preview una vez que esos empezaron a usar el
 * offset. El vértice superior real del cursor está a `tileHeight/2 +
 * TILE_VISUAL_Y_OFFSET` de `worldPos.y` (mismo cálculo que getFurnitureAnchorY
 * pero restando tileHeight/2 en vez de sumarlo, porque acá partimos del
 * vértice de arriba, no del de abajo).
 */
export function getFootprintTopY(worldPosY: number, tileHeight: number) {
  return worldPosY + tileHeight / 2 + TILE_VISUAL_Y_OFFSET;
}

/**
 * Offset del jugador (LobbyScene: cálculo de targetY al caminar hacia una
 * tile). ModularPlayer es un Phaser.GameObjects.Container, no un Sprite con
 * origin(0.5,1) como los muebles — su punto (0,0) depende de los
 * offsetX/offsetY que trae cada parte del avatar (ver AvatarBuilder.ts), no
 * de un origin estándar de Phaser. Por eso NO comparte getFurnitureAnchorY
 * (esa fórmula asume anclaje por el borde inferior de un Sprite, que aquí no
 * aplica) y tiene su propia constante, calibrada por separado a ojo.
 */
export const PLAYER_Y_OFFSET = -20;
