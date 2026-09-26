/**
 * Behaviors de referencia: los casos que el sistema tiene que cubrir, escritos
 * como dato real y validados por los tests.
 *
 * Sirven para tres cosas: documentar el contrato con ejemplos en vez de prosa,
 * fijar en tests que los cuatro casos pedidos son expresables, y quedar
 * disponibles como presets del configurador (Fase 6) para que un creador
 * arranque de una TV que ya funciona en vez de una pantalla en blanco.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ "OPENING" NO ES UN ESTADO
 *
 * Una puerta se describe como CLOSED ↔ OPEN con `opening` / `closing` como
 * animaciones DE TRANSICIÓN, no como cuatro estados. La fase intermedia
 * existe visualmente (el runtime la tiene en `playing`) pero no se persiste.
 *
 * Es deliberado: si OPENING fuera un estado persistido y el cliente que
 * clickeó se desconectara justo ahí, la puerta quedaría en OPENING para toda
 * la sala, y nadie tendría el turno de terminarla. Persistiendo sólo estados
 * ESTABLES, el servidor guarda el destino de una vez y la animación es puro
 * adorno recuperable: quien entra tarde ve la puerta abierta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LAYOUT DE FILAS  (los ejemplos asumen `directions = 4`)
 *
 * Cada animación `directional` ocupa 4 filas, así que los `row` van de 4 en
 * 4. Con `directions = 1` el mismo objeto usaría 0, 1, 2, 3. El generador de
 * atlas (Fase 2) es quien calcula estos números; acá están a mano porque son
 * ejemplos.
 */

import type { WorldBehavior } from './behavior';

/**
 * 🪑 Silla — objeto ESTÁTICO.
 *
 * No hay behavior. Es el 99 % del catálogo actual y la razón por la que
 * `null` es un valor de primera clase: una silla existente no cambia en nada.
 */
export const CHAIR_BEHAVIOR: WorldBehavior | null = null;

/**
 * 🌴 Palmera — objeto ANIMADO (sin interacción).
 *
 *   IDLE ──▶ idle_loop (loop, para siempre)
 */
export const PALM_BEHAVIOR: WorldBehavior = {
  version: 1,
  initialState: 'IDLE',
  states: [{ key: 'IDLE', animation: 'idle_loop' }],
  animations: [
    {
      key: 'idle_loop',
      row: 0,
      startCol: 0,
      framesCount: 6,
      fps: 6,
      loop: true,
      directional: true,
      spriteSheetUrl: null,
    },
  ],
  transitions: [],
};

/**
 * 📺 TV — objeto INTERACTIVO con dos estados estables.
 *
 *   OFF ──click──▶ turn_on ──complete──▶ ON
 *   ON  ──click──▶ turn_off ──complete──▶ OFF
 *
 * Estando en ON, `screen_loop` corre en bucle como animación del estado.
 */
export const TV_BEHAVIOR: WorldBehavior = {
  version: 1,
  initialState: 'OFF',
  states: [
    { key: 'OFF', animation: 'off' },
    { key: 'ON', animation: 'screen_loop' },
  ],
  animations: [
    // Estado apagado: un solo frame. Una animación de 1 frame es la forma de
    // decir "pose quieta" sin un tipo aparte.
    {
      key: 'off',
      row: 0,
      startCol: 0,
      framesCount: 1,
      fps: 1,
      loop: false,
      directional: true,
      spriteSheetUrl: null,
    },
    {
      key: 'turn_on',
      row: 4,
      startCol: 0,
      framesCount: 5,
      fps: 12,
      loop: false,
      directional: true,
      spriteSheetUrl: null,
    },
    {
      key: 'screen_loop',
      row: 8,
      startCol: 0,
      framesCount: 4,
      fps: 8,
      loop: true,
      directional: true,
      spriteSheetUrl: null,
    },
    {
      key: 'turn_off',
      row: 12,
      startCol: 0,
      framesCount: 5,
      fps: 12,
      loop: false,
      directional: true,
      spriteSheetUrl: null,
    },
  ],
  transitions: [
    {
      trigger: 'CLICK',
      fromState: 'OFF',
      action: 'PLAY_ANIMATION',
      animation: 'turn_on',
      onComplete: { action: 'SET_STATE', state: 'ON' },
    },
    {
      trigger: 'CLICK',
      fromState: 'ON',
      action: 'PLAY_ANIMATION',
      animation: 'turn_off',
      onComplete: { action: 'SET_STATE', state: 'OFF' },
    },
  ],
};

/**
 * 🛁 Bañera — INTERACTIVO con un loop intermedio.
 *
 *   IDLE    ──click──▶ water_start ──complete──▶ FILLING
 *   FILLING ──▶ water_loop (loop mientras dure el estado)
 *   FILLING ──click──▶ water_stop  ──complete──▶ IDLE
 */
export const BATHTUB_BEHAVIOR: WorldBehavior = {
  version: 1,
  initialState: 'IDLE',
  states: [
    { key: 'IDLE', animation: 'idle' },
    { key: 'FILLING', animation: 'water_loop' },
  ],
  animations: [
    {
      key: 'idle',
      row: 0,
      startCol: 0,
      framesCount: 1,
      fps: 1,
      loop: false,
      directional: true,
      spriteSheetUrl: null,
    },
    {
      key: 'water_start',
      row: 4,
      startCol: 0,
      framesCount: 6,
      fps: 12,
      loop: false,
      directional: true,
      spriteSheetUrl: null,
    },
    {
      key: 'water_loop',
      row: 8,
      startCol: 0,
      framesCount: 4,
      fps: 8,
      loop: true,
      directional: true,
      spriteSheetUrl: null,
    },
    {
      key: 'water_stop',
      row: 12,
      startCol: 0,
      framesCount: 5,
      fps: 12,
      loop: false,
      directional: true,
      spriteSheetUrl: null,
    },
  ],
  transitions: [
    {
      trigger: 'CLICK',
      fromState: 'IDLE',
      action: 'PLAY_ANIMATION',
      animation: 'water_start',
      onComplete: { action: 'SET_STATE', state: 'FILLING' },
    },
    {
      trigger: 'CLICK',
      fromState: 'FILLING',
      action: 'PLAY_ANIMATION',
      animation: 'water_stop',
      onComplete: { action: 'SET_STATE', state: 'IDLE' },
    },
  ],
};

/**
 * 🚪 Puerta — INTERACTIVO. Igual que la TV en forma, distinto en intención:
 * acá la animación de paso ES el contenido (ver la puerta abrirse).
 *
 *   CLOSED ──click──▶ opening ──complete──▶ OPEN
 *   OPEN   ──click──▶ closing ──complete──▶ CLOSED
 */
export const DOOR_BEHAVIOR: WorldBehavior = {
  version: 1,
  initialState: 'CLOSED',
  states: [
    { key: 'CLOSED', animation: 'closed' },
    { key: 'OPEN', animation: 'open' },
  ],
  animations: [
    {
      key: 'closed',
      row: 0,
      startCol: 0,
      framesCount: 1,
      fps: 1,
      loop: false,
      directional: true,
      spriteSheetUrl: null,
    },
    {
      key: 'opening',
      row: 4,
      startCol: 0,
      framesCount: 6,
      fps: 14,
      loop: false,
      directional: true,
      spriteSheetUrl: null,
    },
    {
      key: 'open',
      row: 8,
      startCol: 0,
      framesCount: 1,
      fps: 1,
      loop: false,
      directional: true,
      spriteSheetUrl: null,
    },
    {
      key: 'closing',
      row: 12,
      startCol: 0,
      framesCount: 6,
      fps: 14,
      loop: false,
      directional: true,
      spriteSheetUrl: null,
    },
  ],
  transitions: [
    {
      trigger: 'CLICK',
      fromState: 'CLOSED',
      action: 'PLAY_ANIMATION',
      animation: 'opening',
      onComplete: { action: 'SET_STATE', state: 'OPEN' },
    },
    {
      trigger: 'CLICK',
      fromState: 'OPEN',
      action: 'PLAY_ANIMATION',
      animation: 'closing',
      onComplete: { action: 'SET_STATE', state: 'CLOSED' },
    },
  ],
};

/**
 * ⛲ Fuente — ANIMADA con arranque al entrar a la sala.
 *
 * Único ejemplo con ROOM_ENTER: el agua arranca sola y queda en bucle, sin
 * que nadie la toque.
 */
export const FOUNTAIN_BEHAVIOR: WorldBehavior = {
  version: 1,
  initialState: 'IDLE',
  states: [
    { key: 'IDLE', animation: 'idle' },
    { key: 'FLOWING', animation: 'water_loop' },
  ],
  animations: [
    {
      key: 'idle',
      row: 0,
      startCol: 0,
      framesCount: 1,
      fps: 1,
      loop: false,
      directional: true,
      spriteSheetUrl: null,
    },
    {
      key: 'water_loop',
      row: 4,
      startCol: 0,
      framesCount: 8,
      fps: 10,
      loop: true,
      directional: true,
      spriteSheetUrl: null,
    },
  ],
  transitions: [
    // Sin animación de paso: al entrar a la sala pasa a FLOWING en el acto y
    // el loop del estado se encarga del resto.
    {
      trigger: 'ROOM_ENTER',
      fromState: 'IDLE',
      action: 'SET_STATE',
      state: 'FLOWING',
    },
  ],
};

export const EXAMPLE_BEHAVIORS = {
  chair: CHAIR_BEHAVIOR,
  palm: PALM_BEHAVIOR,
  tv: TV_BEHAVIOR,
  bathtub: BATHTUB_BEHAVIOR,
  door: DOOR_BEHAVIOR,
  fountain: FOUNTAIN_BEHAVIOR,
} as const;
