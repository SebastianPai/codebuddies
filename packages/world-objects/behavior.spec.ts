/**
 * Contrato del behavior: validación estricta (escritura) y lectura defensiva.
 *
 * Se ejecutan con el Jest que ya existe en apps/api, sin dependencias nuevas
 * (mismo criterio que apps/game/src/game/iso/NavGrid.spec.ts):
 *
 *   cd apps/api && npx jest --rootDir ../.. \
 *     --testMatch "**\/packages/world-objects/*.spec.ts"
 */

import {
  readBehavior,
  validateBehavior,
  WORLD_OBJECT_LIMITS as L,
  type WorldBehavior,
} from './index';
import { BATHTUB_BEHAVIOR, DOOR_BEHAVIOR, PALM_BEHAVIOR, TV_BEHAVIOR } from './examples';

/** Behavior mínimo válido, para mutarlo en cada caso. */
function minimal(): Record<string, any> {
  return {
    version: 1,
    initialState: 'OFF',
    states: [{ key: 'OFF', animation: 'off' }],
    animations: [
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
    ],
    transitions: [],
  };
}

function expectOk(input: unknown): WorldBehavior {
  const result = validateBehavior(input);
  expect(result.errors).toEqual([]);
  expect(result.ok).toBe(true);
  return result.behavior as WorldBehavior;
}

function errorsOf(input: unknown): string[] {
  const result = validateBehavior(input);
  expect(result.ok).toBe(false);
  return result.errors;
}

describe('behavior = null: objeto estático', () => {
  // La garantía de compatibilidad del sistema entero: un objeto sin behavior
  // no es un objeto inválido, es un objeto de los de siempre.
  it.each([null, undefined])('%p es válido y no produce errores', (input) => {
    const result = validateBehavior(input);
    expect(result.behavior).toBeNull();
    expect(result.errors).toEqual([]);
  });

  it('readBehavior devuelve null y no lanza', () => {
    expect(readBehavior(null)).toBeNull();
    expect(readBehavior(undefined)).toBeNull();
  });
});

describe('los cuatro casos pedidos son expresables', () => {
  it('palmera animada en loop', () => {
    const behavior = expectOk(PALM_BEHAVIOR);
    expect(behavior.transitions).toHaveLength(0);
    expect(behavior.animations[0].loop).toBe(true);
  });

  it('TV con OFF <-> ON', () => {
    const behavior = expectOk(TV_BEHAVIOR);
    expect(behavior.states.map((state) => state.key)).toEqual(['OFF', 'ON']);
    expect(behavior.transitions).toHaveLength(2);
  });

  it('bañera con loop intermedio', () => {
    const behavior = expectOk(BATHTUB_BEHAVIOR);
    const filling = behavior.states.find((state) => state.key === 'FILLING');
    expect(filling?.animation).toBe('water_loop');
  });

  it('puerta CLOSED <-> OPEN', () => {
    expectOk(DOOR_BEHAVIOR);
  });
});

describe('animación al revés', () => {
  it('acepta reverse: true y lo conserva', () => {
    const input = minimal();
    input.animations[0].reverse = true;
    expect(expectOk(input).animations[0].reverse).toBe(true);
  });

  it('sin reverse la animación sale igual que antes', () => {
    expect(expectOk(minimal()).animations[0]).not.toHaveProperty('reverse');
  });

  it('rechaza un reverse que no sea booleano', () => {
    const input = minimal();
    input.animations[0].reverse = 'yes';
    expect(errorsOf(input)).toContain('animations[0].reverse: debe ser booleano');
  });
});

describe('estructura inválida', () => {
  it('rechaza un behavior que no es objeto', () => {
    expect(errorsOf('turn_on')).toEqual(['behavior: debe ser un objeto o null']);
    expect(errorsOf(42)).toHaveLength(1);
    expect(errorsOf([])).toHaveLength(1);
  });

  it('rechaza una versión que no sea 1', () => {
    expect(errorsOf({ ...minimal(), version: 2 })).toContain('behavior.version: debe ser 1');
  });

  it('exige al menos un estado', () => {
    expect(errorsOf({ ...minimal(), states: [], initialState: 'OFF' })).toContain(
      'behavior.states: se necesita al menos un estado',
    );
  });

  it('rechaza claves de estado duplicadas', () => {
    const input = minimal();
    input.states = [
      { key: 'OFF', animation: null },
      { key: 'OFF', animation: null },
    ];
    expect(errorsOf(input).some((error) => error.includes('duplicada'))).toBe(true);
  });

  it('rechaza dos transiciones para el mismo (trigger, fromState)', () => {
    const input = minimal();
    input.states = [
      { key: 'OFF', animation: null },
      { key: 'ON', animation: null },
    ];
    input.transitions = [
      { trigger: 'CLICK', fromState: 'OFF', action: 'SET_STATE', state: 'ON' },
      { trigger: 'CLICK', fromState: 'OFF', action: 'SET_STATE', state: 'OFF' },
    ];
    expect(errorsOf(input).some((error) => error.includes('ya hay una transición'))).toBe(true);
  });
});

describe('claves desconocidas: se rechazan, no se ignoran', () => {
  // El punto de seguridad del contrato. Si un campo extra se ignorara en
  // silencio, un creador podría creer que configuró algo que el motor nunca
  // va a leer — y peor, nos ataríamos a aceptar payloads arbitrarios.
  it('en la raíz', () => {
    expect(errorsOf({ ...minimal(), script: 'alert(1)' })).toContain(
      'behavior: propiedad desconocida "script"',
    );
  });

  it('en una animación', () => {
    const input = minimal();
    input.animations[0].onFrame = 'doSomething()';
    expect(errorsOf(input)).toContain('animations[0]: propiedad desconocida "onFrame"');
  });

  it('en un estado', () => {
    const input = minimal();
    input.states[0].onEnter = 'eval';
    expect(errorsOf(input)).toContain('states[0]: propiedad desconocida "onEnter"');
  });

  it('en una transición y en su onComplete', () => {
    const input = minimal();
    input.transitions = [
      {
        trigger: 'CLICK',
        fromState: 'OFF',
        action: 'PLAY_ANIMATION',
        animation: 'off',
        onComplete: { action: 'NONE', callback: 'fn' },
        handler: 'fn',
      },
    ];
    const errors = errorsOf(input);
    expect(errors).toContain('transitions[0]: propiedad desconocida "handler"');
    expect(errors).toContain('transitions[0].onComplete: propiedad desconocida "callback"');
  });

  it('no acepta una acción fuera del enum', () => {
    const input = minimal();
    input.transitions = [
      { trigger: 'CLICK', fromState: 'OFF', action: 'RUN_SCRIPT', script: 'x' },
    ];
    expect(errorsOf(input).some((error) => error.includes('.action: debe ser una de'))).toBe(true);
  });

  it('no acepta un trigger declarado pero no implementado', () => {
    const input = minimal();
    input.transitions = [
      { trigger: 'PROXIMITY', fromState: 'OFF', action: 'SET_STATE', state: 'OFF' },
    ];
    expect(
      errorsOf(input).some((error) => error.includes('todavía no está implementado')),
    ).toBe(true);
  });

  it('rechaza una clave con caracteres de ruta', () => {
    const input = minimal();
    input.states = [{ key: '../../etc/passwd', animation: null }];
    expect(errorsOf(input).some((error) => error.includes('.key: clave inválida'))).toBe(true);
  });
});

describe('referencias cruzadas', () => {
  it('rechaza un initialState que no existe', () => {
    expect(errorsOf({ ...minimal(), initialState: 'NOPE' })).toContain(
      'behavior.initialState: "NOPE" no existe en states',
    );
  });

  it('rechaza una animación de estado que no existe', () => {
    const input = minimal();
    input.states = [{ key: 'OFF', animation: 'fantasma' }];
    expect(errorsOf(input)).toContain('states[0].animation: "fantasma" no existe');
  });

  it('rechaza una transición hacia un estado que no existe', () => {
    const input = minimal();
    input.transitions = [
      { trigger: 'CLICK', fromState: 'OFF', action: 'SET_STATE', state: 'FANTASMA' },
    ];
    expect(errorsOf(input)).toContain('transitions[0].state: "FANTASMA" no existe');
  });

  it('rechaza onComplete SET_STATE sobre una animación en loop', () => {
    // Un loop no termina nunca: ese onComplete jamás se dispararía y el
    // objeto quedaría colgado en la transición.
    const input = minimal();
    input.animations.push({
      key: 'spin',
      row: 4,
      startCol: 0,
      framesCount: 4,
      fps: 8,
      loop: true,
      directional: true,
      spriteSheetUrl: null,
    });
    input.states.push({ key: 'ON', animation: null });
    input.transitions = [
      {
        trigger: 'CLICK',
        fromState: 'OFF',
        action: 'PLAY_ANIMATION',
        animation: 'spin',
        onComplete: { action: 'SET_STATE', state: 'ON' },
      },
    ];
    expect(errorsOf(input).some((error) => error.includes('es loop y nunca termina'))).toBe(true);
  });

  it('rechaza mezclar campos de dos acciones', () => {
    const input = minimal();
    input.states.push({ key: 'ON', animation: null });
    input.transitions = [
      {
        trigger: 'CLICK',
        fromState: 'OFF',
        action: 'SET_STATE',
        state: 'ON',
        animation: 'off',
        onComplete: { action: 'NONE' },
      },
    ];
    const errors = errorsOf(input);
    expect(errors).toContain('transitions[0].animation: sólo aplica con action PLAY_ANIMATION');
    expect(errors).toContain('transitions[0].onComplete: sólo aplica con action PLAY_ANIMATION');
  });
});

describe('límites', () => {
  it(`rechaza más de ${L.maxFramesPerAnimation} frames`, () => {
    const input = minimal();
    input.animations[0].framesCount = L.maxFramesPerAnimation + 1;
    expect(errorsOf(input)).toContain(
      `animations[0].framesCount: máximo ${L.maxFramesPerAnimation} frames`,
    );
  });

  it('acepta exactamente el máximo de frames', () => {
    const input = minimal();
    input.animations[0].framesCount = L.maxFramesPerAnimation;
    expectOk(input);
  });

  it(`rechaza más de ${L.maxAnimations} animaciones`, () => {
    const input = minimal();
    input.animations = Array.from({ length: L.maxAnimations + 1 }, (_unused, index) => ({
      key: `anim_${index}`,
      row: index,
      startCol: 0,
      framesCount: 2,
      fps: 8,
      loop: true,
      directional: false,
      spriteSheetUrl: null,
    }));
    input.states = [{ key: 'OFF', animation: 'anim_0' }];
    expect(errorsOf(input)).toContain(`behavior.animations: máximo ${L.maxAnimations}`);
  });

  it(`rechaza más de ${L.maxStates} estados`, () => {
    const input = minimal();
    input.states = Array.from({ length: L.maxStates + 1 }, (_unused, index) => ({
      key: `S${index}`,
      animation: null,
    }));
    input.initialState = 'S0';
    expect(errorsOf(input)).toContain(`behavior.states: máximo ${L.maxStates}`);
  });

  it(`rechaza más de ${L.maxTransitions} transiciones`, () => {
    const input = minimal();
    input.states = Array.from({ length: L.maxStates }, (_unused, index) => ({
      key: `S${index}`,
      animation: null,
    }));
    input.initialState = 'S0';
    // Se combinan los dos triggers implementados para pasar del tope sin
    // repetir el par (trigger, fromState), que es otro error distinto.
    input.transitions = [
      ...Array.from({ length: L.maxStates }, (_unused, index) => ({
        trigger: 'CLICK',
        fromState: `S${index}`,
        action: 'SET_STATE',
        state: 'S0',
      })),
      ...Array.from({ length: L.maxTransitions - L.maxStates + 1 }, (_unused, index) => ({
        trigger: 'ROOM_ENTER',
        fromState: `S${index}`,
        action: 'SET_STATE',
        state: 'S0',
      })),
    ];
    expect(errorsOf(input)).toContain(`behavior.transitions: máximo ${L.maxTransitions}`);
  });

  it(`rechaza fps fuera de [${L.minFps}, ${L.maxFps}]`, () => {
    for (const fps of [0, -5, L.maxFps + 1]) {
      const input = minimal();
      input.animations[0].fps = fps;
      expect(
        errorsOf(input).some((error) => error.includes('.fps: debe estar entre')),
      ).toBe(true);
    }
  });

  it('rechaza una clave más larga que el máximo', () => {
    const input = minimal();
    input.states = [{ key: 'A'.repeat(L.maxKeyLength + 1), animation: null }];
    expect(errorsOf(input).some((error) => error.includes('.key: clave inválida'))).toBe(true);
  });
});

describe('lectura defensiva (readBehavior)', () => {
  it('un behavior válido pasa tal cual', () => {
    expect(readBehavior(TV_BEHAVIOR)).toEqual(TV_BEHAVIOR);
  });

  it('behavior corrupto sin nada rescatable ⇒ null (objeto estático)', () => {
    expect(readBehavior({ version: 1, states: 'no-soy-un-array' })).toBeNull();
    expect(readBehavior({})).toBeNull();
    expect(readBehavior('basura')).toBeNull();
    expect(readBehavior(['a', 'b'])).toBeNull();
  });

  it('poda la animación de un estado que ya no existe', () => {
    // Versión nueva del objeto que borró "screen_loop": el estado ON
    // sobrevive, quieto, en vez de romper la sala.
    const stale = {
      ...TV_BEHAVIOR,
      animations: TV_BEHAVIOR.animations.filter((animation) => animation.key !== 'screen_loop'),
    };
    const behavior = readBehavior(stale);
    expect(behavior).not.toBeNull();
    expect(behavior!.states.find((state) => state.key === 'ON')?.animation).toBeNull();
  });

  it('descarta la transición cuya animación desapareció', () => {
    const stale = {
      ...TV_BEHAVIOR,
      animations: TV_BEHAVIOR.animations.filter((animation) => animation.key !== 'turn_on'),
    };
    const behavior = readBehavior(stale)!;
    expect(behavior.transitions.map((transition) => transition.fromState)).toEqual(['ON']);
  });

  it('descarta la transición hacia un estado eliminado', () => {
    const stale = {
      ...TV_BEHAVIOR,
      states: TV_BEHAVIOR.states.filter((state) => state.key !== 'ON'),
      initialState: 'OFF',
    };
    const behavior = readBehavior(stale)!;
    expect(behavior.transitions).toHaveLength(0);
    expect(behavior.states.map((state) => state.key)).toEqual(['OFF']);
  });

  it('cae al primer estado si initialState no existe', () => {
    const behavior = readBehavior({ ...TV_BEHAVIOR, initialState: 'FANTASMA' })!;
    expect(behavior.initialState).toBe('OFF');
  });

  it('ignora propiedades desconocidas en vez de fallar', () => {
    // Al LEER, un campo extra (de una versión futura, o basura) no puede
    // dejar la sala sin muebles: se descarta y el resto se usa.
    const behavior = readBehavior({ ...TV_BEHAVIOR, futuro: { algo: true } })!;
    expect(behavior.states).toHaveLength(2);
    expect(behavior.transitions).toHaveLength(2);
  });

  it('recorta los excesos de límites en vez de descartar todo', () => {
    const behavior = readBehavior({
      ...minimal(),
      states: Array.from({ length: L.maxStates + 4 }, (_unused, index) => ({
        key: `S${index}`,
        animation: null,
      })),
      initialState: 'S0',
    })!;
    expect(behavior.states).toHaveLength(L.maxStates);
  });
});
