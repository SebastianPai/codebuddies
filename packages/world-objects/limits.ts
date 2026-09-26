/**
 * Límites del sistema de World Objects, en UN solo lugar.
 *
 * Todo el resto del código (validador, generador de atlas, editor web,
 * runtime del juego) debe leer de aquí — nunca escribir un número suelto.
 * Así subir el tope de frames de 24 a 32 es un cambio de una línea y no una
 * cacería por el repo.
 *
 * Estos límites son NUEVOS y sólo aplican al `behavior` y a los atlas que
 * genera el sistema de objetos interactivos. Los límites que ya existían —
 * 5 MB por archivo subido, allowlist de MIME con sniffing real de sharp
 * (SVG excluido a propósito), precio 100-10000 coins, 5 pendientes / 3 por
 * día / 10 por semana en el marketplace — siguen viviendo donde estaban y
 * NO se duplican aquí.
 */
export const WORLD_OBJECT_LIMITS = {
  /** Estados lógicos por objeto (OFF, ON, OPENING, ...). */
  maxStates: 8,

  /** Animaciones declaradas por objeto (turn_on, turn_off, screen_loop...). */
  maxAnimations: 8,

  /** Transiciones (trigger + estado origen -> acción) por objeto. */
  maxTransitions: 16,

  /** Frames de una animación. 24 = 2 s a 12 fps. */
  maxFramesPerAnimation: 24,

  minFps: 1,
  maxFps: 30,

  /**
   * Lado de un frame en píxeles. 512 ya son 8x8 tiles de 64x32, de sobra
   * para el mueble más grande.
   */
  minFrameSize: 16,
  maxFrameSize: 512,

  /**
   * Lado máximo del atlas generado (filas = direcciones de cada animación,
   * columnas = frames). 4096 es el tope seguro de textura en WebGL para
   * hardware de gama baja.
   */
  maxAtlasSize: 4096,

  /** Peso del PNG del atlas ya comprimido. */
  maxAtlasBytes: 2 * 1024 * 1024,

  /** Largo de una clave de estado o de animación. */
  maxKeyLength: 32,

  /**
   * Píxeles opacos mínimos que debe tener un frame, en ABSOLUTO (no como
   * proporción del lienzo).
   *
   * El problema que resuelve: un frame 100 % transparente deja el mueble
   * INCLICABLE, porque el área de interacción es el alpha real del frame
   * actual (`pixelPerfect` en RoomItemsManager.ITEM_INTERACTIVE_CONFIG). Una
   * "lámpara apagada" cuyo frame apagado esté vacío sería imposible de volver
   * a encender.
   *
   * Es absoluto y no un porcentaje a propósito: con un 1 % del lienzo, el
   * umbral crece con el tamaño del PNG y se rechaza arte perfectamente
   * legítimo — una lámpara de 2×80 px en un lienzo de 128×128 da 0,98 % y
   * quedaría fuera, y en 512×512 harían falta 2.621 píxeles opacos. 16 px
   * (un bloque de 4×4) es "esto no se puede clickear" sin ambigüedad,
   * independiente del lienzo.
   *
   * Lo valida el generador de atlas, no el contrato del behavior.
   */
  minOpaquePixels: 16,

  /**
   * Alpha a partir del cual un píxel cuenta como opaco.
   *
   * Es exactamente el `alphaTolerance` de
   * RoomItemsManager.ITEM_INTERACTIVE_CONFIG: el handler pixel-perfect de
   * Phaser considera acierto cuando `alpha >= alphaTolerance`. Si acá se
   * usara otro número, la validación diría "clickeable" sobre píxeles que el
   * motor no cuenta (o al revés).
   */
  opaqueAlphaThreshold: 1,

  /**
   * Caras/direcciones admitidas en un atlas, que son las mismas que reconoce
   * `getFaceCount()` en el juego (WorldItemData.directions).
   */
  allowedDirections: [1, 2, 4] as readonly number[],
} as const;

export type WorldObjectLimits = typeof WORLD_OBJECT_LIMITS;
