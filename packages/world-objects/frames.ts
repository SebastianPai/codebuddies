/**
 * Cálculo de FRAME de una animación. Sin Phaser, sin DOM, sin tiempo propio:
 * todo entra por parámetro.
 *
 * Por qué acá y no en el juego: el preview del editor (Fase 7) tiene que
 * mostrar EXACTAMENTE el mismo frame que la sala, y el objeto colocado tiene
 * que coincidir con lo que el creador aprobó. Si cada uno hiciera su propia
 * cuenta, el "se veía distinto en el editor" sería inevitable. Es el mismo
 * problema que `footprintRotation.ts` documenta como doloroso por estar
 * duplicado cliente/servidor — acá se evita de entrada.
 *
 * La fórmula es la de `PetSystem.update()`, que ya está probada en
 * producción con las mascotas:
 *
 *     raw   = floor(elapsedMs / (1000 / fps))
 *     loop  → frame = raw % framesCount          (nunca termina)
 *     !loop → frame = min(raw, framesCount - 1)  (se queda en el último)
 */

import type { WorldAnimation } from './behavior';
import { WORLD_OBJECT_LIMITS as L } from './limits';

export type AnimationFrame = {
  /** Índice de frame dentro de la animación, 0-based. */
  frame: number;
  /**
   * La animación ya recorrió todos sus frames. Siempre false en loop: una
   * animación en bucle no "termina" nunca, y de eso depende que un
   * onComplete SET_STATE sobre un loop sea un error de validación.
   */
  completed: boolean;
};

/** fps dentro del rango permitido, sin importar qué diga el dato. */
export function clampFps(fps: number): number {
  const n = Math.trunc(Number(fps));
  if (!Number.isFinite(n)) return L.minFps;
  return Math.max(L.minFps, Math.min(L.maxFps, n));
}

/** Duración total de una pasada completa, en ms. */
export function animationDurationMs(animation: WorldAnimation): number {
  return (animation.framesCount * 1000) / clampFps(animation.fps);
}

/**
 * Frame a mostrar tras `elapsedMs` de haber arrancado la animación.
 *
 * `elapsedMs` negativo (reloj del cliente por detrás del `at` del servidor,
 * pasa) se trata como 0: se muestra el primer frame, nunca un índice
 * negativo.
 */
export function computeAnimationFrame(
  animation: WorldAnimation,
  elapsedMs: number,
): AnimationFrame {
  const framesCount = Math.max(1, Math.trunc(animation.framesCount));
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const msPerFrame = 1000 / clampFps(animation.fps);
  const raw = Math.floor(elapsed / msPerFrame);

  if (animation.loop) {
    return { frame: raw % framesCount, completed: false };
  }

  return {
    frame: Math.min(raw, framesCount - 1),
    // `raw >= framesCount` y no `>= framesCount - 1`: el último frame
    // también tiene que estar en pantalla su 1/fps antes de dar la
    // animación por terminada. Si no, un turn_on de 5 frames cortaría en el
    // cuarto y el jugador nunca vería el último.
    completed: raw >= framesCount,
  };
}

/**
 * Celda del atlas (fila, columna) de un frame concreto.
 *
 * El llamador hace con esto el recorte que ya hacen RoomItemsManager y
 * PetSystem:
 *
 *     tex.add(name, 0, col * frameWidth, row * frameHeight, frameWidth, frameHeight)
 *
 * `directionIndex` es la rotación 0-3 ya resuelta a cara por quien llama
 * (`getSpriteFrameIndex()` en el juego): acá no se reinterpreta la rotación,
 * sólo se ubica la celda.
 */
export function animationCell(
  animation: WorldAnimation,
  frame: number,
  directionIndex = 0,
): { row: number; col: number } {
  const dir = animation.directional ? Math.max(0, Math.trunc(directionIndex)) : 0;
  return {
    row: animation.row + dir,
    col: animation.startCol + Math.max(0, Math.trunc(frame)),
  };
}

/**
 * Cuántas filas del atlas ocupa el bloque de una animación. Lo necesita el
 * generador de atlas (Fase 2) para apilar las animaciones sin pisarse, y el
 * validador de tamaño para comprobar que el atlas entra en maxAtlasSize.
 */
export function animationRowSpan(animation: WorldAnimation, directions: number): number {
  return animation.directional ? Math.max(1, Math.trunc(directions)) : 1;
}

export type AtlasGeometry = {
  frameWidth: number;
  frameHeight: number;
  /** Filas reales del atlas: 1 si no es direccional o si no cuadra. */
  rows: number;
  cols: number;
};

/**
 * Tamaño de celda DERIVADO de las medidas reales del atlas.
 *
 * El generador de Fase 2 produce un atlas por animación con `framesCount`
 * columnas y una fila por dirección, así que:
 *
 *     frameWidth  = ancho / framesCount
 *     frameHeight = alto  / filas
 *
 * Así no hace falta guardar las medidas en el contrato, y no se asume que el
 * frame sea cuadrado ni que todos los objetos midan igual.
 *
 * Devuelve null cuando el atlas no casa con su metadata (item editado a mano,
 * `directions` cambiado después de subir el arte). Mejor no dibujar que
 * recortar celdas corridas — pero ojo: no poder dibujar NO debe detener la
 * máquina de estados, que es una lección de la Fase 5.
 *
 * ⚠️ REPLICA la derivación privada `frameGeometry()` de
 * apps/game/src/game/systems/WorldObjectAnimator.ts, igual que
 * `footprintRotation.ts` replica a `engine-data.util.ts`. Hay un test que
 * importa LAS DOS y comprueba que dan la misma celda
 * (apps/web/components/item-editor/behavior-preview.parity.spec.ts). Si se
 * toca una hay que tocar la otra; el test lo detecta.
 */
export function resolveAtlasGeometry(
  animation: WorldAnimation,
  atlas: { width: number; height: number } | null | undefined,
  directions: number,
): AtlasGeometry | null {
  const width = Number(atlas?.width);
  const height = Number(atlas?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  const cols = Math.max(1, Math.trunc(animation.framesCount));
  if (width % cols !== 0) return null;

  const declaredRows = animation.directional ? Math.max(1, Math.trunc(directions)) : 1;

  // La divisibilidad sola no alcanza: un atlas de UNA fila de 48 px también es
  // divisible por 4, y creeríamos que tiene 4 filas de 12 px. Se exige además
  // que la celda llegue al mínimo que acepta el generador.
  const fitsRows =
    height % declaredRows === 0 && height / declaredRows >= L.minFrameSize;
  const rows = fitsRows ? declaredRows : 1;

  return { frameWidth: width / cols, frameHeight: height / rows, rows, cols };
}
