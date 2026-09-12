import type Phaser from "phaser";
import type { LobbySceneType } from "../types/LobbySceneType";
import { depthFromGroundPoint } from "./IsoDepth";

/**
 * Punto de apoyo y profundidad de cualquier "actor" del mundo: el jugador,
 * los otros jugadores, la mascota, el mayordomo y los NPC que vengan.
 *
 * Es la pieza compartida mínima de infraestructura espacial entre todos
 * ellos. Antes cada uno resolvía su profundidad por su cuenta y en escalas
 * incompatibles:
 *
 *   jugador y otros jugadores  → tileY*1000 + tileX      (~0 a 19.000)
 *   muebles                    → tileY*1000 + tileX      (~0 a 19.000)
 *   mascota y mayordomo        → sprite.y                (~200 a 600)
 *
 * Con esas escalas, el gato y el mayordomo quedaban SIEMPRE detrás de
 * cualquier mueble y del propio jugador, en toda la sala. No era un ajuste
 * fino mal calibrado: eran tres espacios de orden distintos comparándose
 * entre sí.
 *
 * El comportamiento (seguir, deambular, ir a un destino por click) sigue
 * siendo de cada sistema. Lo que se comparte es dónde apoya el actor y cómo
 * se ordena respecto del resto del mundo.
 */
export type GroundActor = {
  x: number;
  y: number;
  setDepth?: (value: number) => unknown;
  getGroundPoint?: () => { x: number; y: number };
};

/**
 * Dónde pisa un actor, en coordenadas de mundo.
 *
 * - Un `ModularPlayer` es un Container cuyo (0,0) NO está en los pies, así
 *   que expone `getGroundPoint()` con la medida real del avatar.
 * - Un sprite de NPC usa `setOrigin(0.5, 1)`, con lo que su propio (x, y)
 *   ya es el punto de apoyo.
 */
export function resolveActorGroundPoint(actor: GroundActor): {
  x: number;
  y: number;
} {
  if (typeof actor.getGroundPoint === "function") {
    return actor.getGroundPoint();
  }
  return { x: actor.x, y: actor.y };
}

/**
 * Recalcula y aplica la profundidad de un actor a partir de su punto de
 * apoyo. Devuelve el valor aplicado (útil para colgar de él una sombra o un
 * accesorio justo por debajo).
 */
export function syncActorDepth(
  scene: Phaser.Scene,
  actor: GroundActor,
  elevation = 0,
): number {
  const grid = (scene as LobbySceneType).isoGrid;
  const ground = resolveActorGroundPoint(actor);

  // Sin grid (cambio de sala en curso) la Y de pantalla es la mejor
  // aproximación monótona disponible; el frame siguiente ya tendrá grid.
  const depth = grid
    ? depthFromGroundPoint(grid, ground.x, ground.y, elevation)
    : ground.y;

  actor.setDepth?.(depth);

  return depth;
}
