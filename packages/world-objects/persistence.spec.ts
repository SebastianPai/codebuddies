/**
 * Estado persistido: estable vs transición en curso.
 *
 *   cd packages/world-objects && pnpm test
 */

import {
  BEHAVIOR_STATE_KEY,
  buildPersistedState,
  effectiveStateKey,
  isTransitionInFlight,
  readPersistedState,
  resolveTrigger,
  toRemoteUpdate,
  writePersistedState,
  type PersistedBehaviorState,
} from './index';
import { BATHTUB_BEHAVIOR, FOUNTAIN_BEHAVIOR, TV_BEHAVIOR } from './examples';

const T0 = 1_700_000_000_000;
// turn_on / turn_off: 5 frames a 12 fps ≈ 416,67 ms
const TURN_MS = (5 * 1000) / 12;

/** Lo que el servidor guardaría tras un CLICK sobre la TV apagada. */
function tvTurningOn(at = T0): PersistedBehaviorState {
  const resolution = resolveTrigger(TV_BEHAVIOR, 'OFF', 'CLICK')!;
  return buildPersistedState(resolution, 'OFF', at);
}

describe('readPersistedState', () => {
  it('lee el bloque de behavior de un state crudo', () => {
    expect(
      readPersistedState({ behavior: { key: 'ON', via: 'turn_on', to: null, at: T0 } }),
    ).toEqual({ key: 'ON', via: 'turn_on', to: null, at: T0 });
  });

  it('completa los campos que falten', () => {
    expect(readPersistedState({ behavior: { key: 'OFF' } })).toEqual({
      key: 'OFF',
      via: null,
      to: null,
      at: null,
    });
  });

  it('devuelve null cuando no hay bloque (objeto de siempre)', () => {
    // Es lo que hace que un item sin behavior arranque en su initialState en
    // vez de romperse.
    expect(readPersistedState(null)).toBeNull();
    expect(readPersistedState({})).toBeNull();
    expect(readPersistedState({ on: true })).toBeNull();
    expect(readPersistedState({ open: false, surface: true })).toBeNull();
  });

  it('nunca lanza con datos corruptos', () => {
    expect(readPersistedState('basura')).toBeNull();
    expect(readPersistedState([1, 2, 3])).toBeNull();
    expect(readPersistedState({ behavior: 'ON' })).toBeNull();
    expect(readPersistedState({ behavior: { key: 42 } })).toBeNull();
    expect(readPersistedState({ behavior: { key: 'ON', at: 'ayer' } })).toEqual({
      key: 'ON',
      via: null,
      to: null,
      at: null,
    });
  });
});

describe('writePersistedState — compatibilidad con el state de siempre', () => {
  it('no toca las claves legacy', () => {
    // Un objeto puede tener historia de TOGGLE y estrenar behavior después.
    const result = writePersistedState(
      { on: true, open: false, surface: true, width: 2 },
      { key: 'ON', via: null, to: null, at: T0 },
    );

    expect(result).toEqual({
      on: true,
      open: false,
      surface: true,
      width: 2,
      [BEHAVIOR_STATE_KEY]: { key: 'ON', via: null, to: null, at: T0 },
    });
  });

  it('funciona sobre un state vacío o inexistente', () => {
    const persisted = { key: 'OFF', via: null, to: null, at: T0 };
    expect(writePersistedState(null, persisted)).toEqual({ behavior: persisted });
    expect(writePersistedState(undefined, persisted)).toEqual({ behavior: persisted });
  });

  it('hace ida y vuelta con readPersistedState', () => {
    const persisted = tvTurningOn();
    expect(readPersistedState(writePersistedState({}, persisted))).toEqual(persisted);
  });
});

describe('buildPersistedState', () => {
  it('PLAY_ANIMATION guarda el estado de PARTIDA, no el destino', () => {
    // El corazón del asunto: durante turn_on la TV sigue estando OFF, con una
    // transición apuntando a ON. Guardar ON de una vez es lo que haría que
    // quien entra a mitad la viera ya encendida.
    expect(tvTurningOn()).toEqual({
      key: 'OFF',
      via: 'turn_on',
      to: 'ON',
      at: T0,
    });
  });

  it('SET_STATE asienta en el acto, sin transición', () => {
    const resolution = resolveTrigger(FOUNTAIN_BEHAVIOR, 'IDLE', 'ROOM_ENTER')!;
    expect(buildPersistedState(resolution, 'IDLE', T0)).toEqual({
      key: 'FLOWING',
      via: null,
      to: null,
      at: T0,
    });
  });

  it('una animación que no cambia de estado no deja `to` pendiente', () => {
    const behavior = {
      version: 1 as const,
      initialState: 'IDLE',
      states: [{ key: 'IDLE', animation: null }],
      animations: [
        {
          key: 'pulse',
          row: 0,
          startCol: 0,
          framesCount: 4,
          fps: 8,
          loop: false,
          directional: true,
          spriteSheetUrl: null,
        },
      ],
      transitions: [
        {
          trigger: 'CLICK' as const,
          fromState: 'IDLE',
          action: 'PLAY_ANIMATION' as const,
          animation: 'pulse',
          onComplete: { action: 'NONE' as const },
        },
      ],
    };

    const persisted = buildPersistedState(
      resolveTrigger(behavior, 'IDLE', 'CLICK')!,
      'IDLE',
      T0,
    );
    expect(persisted).toMatchObject({ key: 'IDLE', via: 'pulse', to: null });
  });
});

describe('effectiveStateKey — el estado es función pura de (persistido, ahora)', () => {
  it('durante la transición sigue siendo el estado de partida', () => {
    const persisted = tvTurningOn();
    expect(effectiveStateKey(TV_BEHAVIOR, persisted, T0)).toBe('OFF');
    expect(effectiveStateKey(TV_BEHAVIOR, persisted, T0 + TURN_MS / 2)).toBe('OFF');
  });

  it('pasada la animación devuelve el destino SIN otra escritura', () => {
    // Nadie tiene que "cerrar" la transición: si el jugador que la disparó se
    // desconecta, el dato sigue resolviendo bien para todos los demás.
    const persisted = tvTurningOn();
    expect(effectiveStateKey(TV_BEHAVIOR, persisted, T0 + TURN_MS)).toBe('ON');
    expect(effectiveStateKey(TV_BEHAVIOR, persisted, T0 + 86_400_000)).toBe('ON');
  });

  it('sin nada persistido arranca en el estado inicial', () => {
    expect(effectiveStateKey(TV_BEHAVIOR, null, T0)).toBe('OFF');
  });

  it('un estado que ya no existe cae al inicial', () => {
    // Versión nueva del objeto que borró ese estado.
    const stale = { key: 'ESTADO_BORRADO', via: null, to: null, at: T0 };
    expect(effectiveStateKey(TV_BEHAVIOR, stale, T0)).toBe('OFF');
  });

  it('una animación que ya no existe se da por asentada', () => {
    const stale = { key: 'OFF', via: 'animacion_borrada', to: 'ON', at: T0 };
    expect(effectiveStateKey(TV_BEHAVIOR, stale, T0)).toBe('ON');
  });
});

describe('isTransitionInFlight — anti click-spam del servidor', () => {
  it('es true mientras la animación no terminó', () => {
    const persisted = tvTurningOn();
    expect(isTransitionInFlight(TV_BEHAVIOR, persisted, T0)).toBe(true);
    expect(isTransitionInFlight(TV_BEHAVIOR, persisted, T0 + TURN_MS - 1)).toBe(true);
  });

  it('deja de serlo justo al terminar', () => {
    const persisted = tvTurningOn();
    expect(isTransitionInFlight(TV_BEHAVIOR, persisted, T0 + TURN_MS)).toBe(false);
  });

  it('un estado asentado nunca está en vuelo', () => {
    expect(
      isTransitionInFlight(TV_BEHAVIOR, { key: 'ON', via: null, to: null, at: T0 }, T0),
    ).toBe(false);
    expect(isTransitionInFlight(TV_BEHAVIOR, null, T0)).toBe(false);
  });

  it('un loop de ESTADO no bloquea: la bañera se puede cerrar', () => {
    // FILLING corre water_loop indefinidamente, pero eso no es una transición
    // pendiente: el segundo click tiene que entrar.
    const filling = { key: 'FILLING', via: null, to: null, at: T0 };
    expect(isTransitionInFlight(BATHTUB_BEHAVIOR, filling, T0 + 60_000)).toBe(false);
  });

  it('una animación sin cambio de estado tampoco bloquea para siempre', () => {
    const persisted = { key: 'OFF', via: 'screen_loop', to: null, at: T0 };
    expect(isTransitionInFlight(TV_BEHAVIOR, persisted, T0 + 1_000_000)).toBe(false);
  });
});

describe('toRemoteUpdate — lo que viaja a los clientes', () => {
  it('lleva el estado FINAL, la animación de paso y el instante', () => {
    expect(toRemoteUpdate(tvTurningOn())).toEqual({
      state: 'ON',
      via: 'turn_on',
      at: T0,
    });
  });

  it('sin transición lleva el estado estable', () => {
    expect(toRemoteUpdate({ key: 'ON', via: null, to: null, at: T0 })).toEqual({
      state: 'ON',
      via: null,
      at: T0,
    });
  });
});

describe('jugador que entra durante una transición', () => {
  it('reanuda la animación desde donde va, no desde cero', () => {
    // C entra 200 ms después de que A hiciera click. Lee el state de
    // `room:items`, lo convierte a update remoto y aplica el mismo desfase que
    // A: ambos aterrizan en ON al mismo tiempo.
    const stored = writePersistedState({}, tvTurningOn(T0));
    const persisted = readPersistedState(stored)!;

    const joinAt = T0 + 200;
    expect(isTransitionInFlight(TV_BEHAVIOR, persisted, joinAt)).toBe(true);
    expect(effectiveStateKey(TV_BEHAVIOR, persisted, joinAt)).toBe('OFF');

    const update = toRemoteUpdate(persisted);
    expect(update).toEqual({ state: 'ON', via: 'turn_on', at: T0 });
    // `at` es del SERVIDOR, así que el cliente calcula 200 ms de animación ya
    // consumidos en vez de empezar de nuevo.
    expect(joinAt - update.at!).toBe(200);
  });

  it('quien entra después de que terminó ve el estado final, sin animar', () => {
    const persisted = readPersistedState(writePersistedState({}, tvTurningOn(T0)))!;
    const joinAt = T0 + 30_000;

    expect(isTransitionInFlight(TV_BEHAVIOR, persisted, joinAt)).toBe(false);
    expect(effectiveStateKey(TV_BEHAVIOR, persisted, joinAt)).toBe('ON');
  });
});
