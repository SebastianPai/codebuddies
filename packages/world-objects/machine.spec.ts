/**
 * Máquina de estados: resolución del servidor, runtime del cliente,
 * click spam, recarga de sala y resolución defensiva de versiones.
 *
 *   cd apps/api && npx jest --rootDir ../.. \
 *     --testMatch "**\/packages/world-objects/*.spec.ts"
 */

import {
  activeAnimation,
  applyRemoteState,
  applyTrigger,
  computeAnimationFrame,
  createRuntime,
  createRuntimeFromRaw,
  describeBehaviorKind,
  findTransition,
  hasTrigger,
  isBusy,
  resolveState,
  resolveTrigger,
  tick,
  type WorldBehavior,
  type WorldObjectRuntime,
} from './index';
import {
  BATHTUB_BEHAVIOR,
  CHAIR_BEHAVIOR,
  DOOR_BEHAVIOR,
  FOUNTAIN_BEHAVIOR,
  PALM_BEHAVIOR,
  TV_BEHAVIOR,
} from './examples';

const T0 = 1_700_000_000_000;

// turn_on / turn_off: 5 frames a 12 fps ≈ 416.67 ms
const TURN_MS = (5 * 1000) / 12;

/** Corre `tick` hasta que la transición se asiente (o se agote la paciencia). */
function settle(
  behavior: WorldBehavior,
  runtime: WorldObjectRuntime,
  now: number,
): WorldObjectRuntime {
  let current = runtime;
  for (let step = 0; step < 10 && current.playing; step++) {
    const next = tick(behavior, current, now);
    if (next === current) break;
    current = next;
  }
  return current;
}

describe('objeto sin behavior', () => {
  it('la silla no tiene behavior ni triggers', () => {
    expect(CHAIR_BEHAVIOR).toBeNull();
    expect(hasTrigger(CHAIR_BEHAVIOR, 'CLICK')).toBe(false);
    expect(describeBehaviorKind(CHAIR_BEHAVIOR)).toBe('STATIC');
  });

  it('createRuntimeFromRaw devuelve null y el llamador sigue por el camino viejo', () => {
    expect(createRuntimeFromRaw(null, null, T0)).toBeNull();
    expect(createRuntimeFromRaw({ basura: true }, 'ON', T0)).toBeNull();
  });
});

describe('etiqueta derivada para el Marketplace', () => {
  it.each([
    [CHAIR_BEHAVIOR, 'STATIC'],
    [PALM_BEHAVIOR, 'ANIMATED'],
    [TV_BEHAVIOR, 'INTERACTIVE'],
    [DOOR_BEHAVIOR, 'INTERACTIVE'],
  ] as const)('%#', (behavior, expected) => {
    expect(describeBehaviorKind(behavior)).toBe(expected);
  });
});

describe('estado inicial', () => {
  it('arranca en initialState cuando no hay nada persistido', () => {
    expect(createRuntime(TV_BEHAVIOR, null, T0).stateKey).toBe('OFF');
    expect(createRuntime(TV_BEHAVIOR, undefined, T0).stateKey).toBe('OFF');
  });

  it('respeta el estado persistido: la TV ya estaba encendida al entrar', () => {
    const runtime = createRuntime(TV_BEHAVIOR, 'ON', T0);
    expect(runtime.stateKey).toBe('ON');
    expect(runtime.playing).toBeNull();
    // Y el loop de la pantalla arranca solo, sin ninguna transición.
    expect(activeAnimation(TV_BEHAVIOR, runtime)?.animation.key).toBe('screen_loop');
  });

  it('no arranca ninguna transición por sí solo', () => {
    expect(createRuntime(DOOR_BEHAVIOR, 'OPEN', T0).playing).toBeNull();
  });
});

describe('resolveTrigger: lo que decide el SERVIDOR', () => {
  it('OFF + CLICK ⇒ animación turn_on y estado final ON', () => {
    const resolution = resolveTrigger(TV_BEHAVIOR, 'OFF', 'CLICK');
    expect(resolution).toMatchObject({ animationKey: 'turn_on', nextState: 'ON' });
  });

  it('ON + CLICK ⇒ animación turn_off y estado final OFF', () => {
    const resolution = resolveTrigger(TV_BEHAVIOR, 'ON', 'CLICK');
    expect(resolution).toMatchObject({ animationKey: 'turn_off', nextState: 'OFF' });
  });

  it('persiste el estado ESTABLE, nunca la fase intermedia', () => {
    // Por esto una puerta no queda en "OPENING" para toda la sala si el
    // cliente que la abrió se desconecta a mitad de la animación.
    expect(resolveTrigger(DOOR_BEHAVIOR, 'CLOSED', 'CLICK')!.nextState).toBe('OPEN');
    expect(resolveTrigger(DOOR_BEHAVIOR, 'OPEN', 'CLICK')!.nextState).toBe('CLOSED');
  });

  it('SET_STATE sin animación de paso', () => {
    const resolution = resolveTrigger(FOUNTAIN_BEHAVIOR, 'IDLE', 'ROOM_ENTER');
    expect(resolution).toMatchObject({ animationKey: null, nextState: 'FLOWING' });
  });

  it('transición inexistente ⇒ null (no es un error, el objeto no reacciona)', () => {
    expect(resolveTrigger(TV_BEHAVIOR, 'OFF', 'ROOM_ENTER')).toBeNull();
    expect(resolveTrigger(PALM_BEHAVIOR, 'IDLE', 'CLICK')).toBeNull();
    expect(resolveTrigger(FOUNTAIN_BEHAVIOR, 'FLOWING', 'ROOM_ENTER')).toBeNull();
  });

  it('estado inexistente cae al inicial antes de buscar la transición', () => {
    // Un RoomItem guardado con un estado que la versión nueva del objeto ya
    // no tiene: se comporta como si estuviera en OFF, no revienta.
    expect(resolveTrigger(TV_BEHAVIOR, 'ESTADO_BORRADO', 'CLICK')).toMatchObject({
      nextState: 'ON',
    });
  });
});

describe('TV: OFF → ON → OFF de punta a punta', () => {
  it('click, animación, cambio de estado, y de vuelta', () => {
    let runtime = createRuntime(TV_BEHAVIOR, null, T0);
    expect(runtime.stateKey).toBe('OFF');

    // ── click: arranca turn_on, el estado todavía NO cambió ──
    const first = applyTrigger(TV_BEHAVIOR, runtime, 'CLICK', T0);
    expect(first.accepted).toBe(true);
    runtime = first.runtime;
    expect(runtime.stateKey).toBe('OFF');
    expect(runtime.playing?.animationKey).toBe('turn_on');
    expect(activeAnimation(TV_BEHAVIOR, runtime)).toMatchObject({
      fromTransition: true,
      startedAt: T0,
    });

    // ── a mitad de animación sigue en transición ──
    runtime = tick(TV_BEHAVIOR, runtime, T0 + TURN_MS / 2);
    expect(runtime.playing).not.toBeNull();
    expect(runtime.stateKey).toBe('OFF');

    // ── al terminar, onComplete aplica SET_STATE ON ──
    runtime = tick(TV_BEHAVIOR, runtime, T0 + TURN_MS);
    expect(runtime.playing).toBeNull();
    expect(runtime.stateKey).toBe('ON');
    expect(activeAnimation(TV_BEHAVIOR, runtime)?.animation.key).toBe('screen_loop');

    // ── segundo click: vuelve a OFF por turn_off ──
    const second = applyTrigger(TV_BEHAVIOR, runtime, 'CLICK', T0 + 5_000);
    expect(second.runtime.playing?.animationKey).toBe('turn_off');
    runtime = tick(TV_BEHAVIOR, second.runtime, T0 + 5_000 + TURN_MS);
    expect(runtime.stateKey).toBe('OFF');
    expect(activeAnimation(TV_BEHAVIOR, runtime)?.animation.key).toBe('off');
  });
});

describe('bañera: loop intermedio', () => {
  it('IDLE → water_start → FILLING(loop) → water_stop → IDLE', () => {
    const startMs = (6 * 1000) / 12; // water_start: 6 frames a 12 fps
    const stopMs = (5 * 1000) / 12;

    let runtime = createRuntime(BATHTUB_BEHAVIOR, null, T0);
    runtime = applyTrigger(BATHTUB_BEHAVIOR, runtime, 'CLICK', T0).runtime;
    expect(runtime.playing?.animationKey).toBe('water_start');

    runtime = tick(BATHTUB_BEHAVIOR, runtime, T0 + startMs);
    expect(runtime.stateKey).toBe('FILLING');

    // El loop del estado corre indefinidamente y NO bloquea otro click.
    const flowing = activeAnimation(BATHTUB_BEHAVIOR, runtime)!;
    expect(flowing.animation.key).toBe('water_loop');
    expect(flowing.animation.loop).toBe(true);
    expect(isBusy(runtime)).toBe(false);

    // Diez segundos después sigue en FILLING, sin tocar el estado.
    runtime = tick(BATHTUB_BEHAVIOR, runtime, T0 + startMs + 10_000);
    expect(runtime.stateKey).toBe('FILLING');

    runtime = applyTrigger(BATHTUB_BEHAVIOR, runtime, 'CLICK', T0 + 20_000).runtime;
    expect(runtime.playing?.animationKey).toBe('water_stop');
    runtime = tick(BATHTUB_BEHAVIOR, runtime, T0 + 20_000 + stopMs);
    expect(runtime.stateKey).toBe('IDLE');
  });
});

describe('puerta', () => {
  it('CLOSED → OPEN → CLOSED', () => {
    const openMs = (6 * 1000) / 14;
    let runtime = createRuntime(DOOR_BEHAVIOR, null, T0);

    runtime = settle(
      DOOR_BEHAVIOR,
      applyTrigger(DOOR_BEHAVIOR, runtime, 'CLICK', T0).runtime,
      T0 + openMs,
    );
    expect(runtime.stateKey).toBe('OPEN');

    runtime = settle(
      DOOR_BEHAVIOR,
      applyTrigger(DOOR_BEHAVIOR, runtime, 'CLICK', T0 + 1_000).runtime,
      T0 + 1_000 + openMs,
    );
    expect(runtime.stateKey).toBe('CLOSED');
  });
});

describe('animaciones de estado y ROOM_ENTER', () => {
  it('la palmera anima en loop sin ninguna interacción', () => {
    const runtime = createRuntime(PALM_BEHAVIOR, null, T0);
    const active = activeAnimation(PALM_BEHAVIOR, runtime)!;
    expect(active.animation.loop).toBe(true);
    expect(active.fromTransition).toBe(false);
    // Un tick no cambia nada: no hay transición que asentar.
    expect(tick(PALM_BEHAVIOR, runtime, T0 + 100_000)).toBe(runtime);
  });

  it('la fuente arranca su loop al entrar a la sala', () => {
    let runtime = createRuntime(FOUNTAIN_BEHAVIOR, null, T0);
    expect(activeAnimation(FOUNTAIN_BEHAVIOR, runtime)?.animation.key).toBe('idle');

    const outcome = applyTrigger(FOUNTAIN_BEHAVIOR, runtime, 'ROOM_ENTER', T0);
    expect(outcome.accepted).toBe(true);
    runtime = outcome.runtime;
    expect(runtime.stateKey).toBe('FLOWING');
    expect(activeAnimation(FOUNTAIN_BEHAVIOR, runtime)?.animation.key).toBe('water_loop');
  });

  it('ROOM_ENTER sobre un objeto que no lo declara no hace nada', () => {
    const runtime = createRuntime(TV_BEHAVIOR, 'ON', T0);
    const outcome = applyTrigger(TV_BEHAVIOR, runtime, 'ROOM_ENTER', T0);
    expect(outcome.accepted).toBe(false);
    expect(outcome.runtime).toBe(runtime); // misma identidad: cero trabajo
  });

  it('un estado sin animación no consume el bucle de animación', () => {
    const behavior: WorldBehavior = {
      version: 1,
      initialState: 'IDLE',
      states: [{ key: 'IDLE', animation: null }],
      animations: [],
      transitions: [],
    };
    expect(activeAnimation(behavior, createRuntime(behavior, null, T0))).toBeNull();
  });
});

describe('CLICK SPAM: 20 clicks seguidos', () => {
  it('produce UNA animación y UN cambio de estado', () => {
    let runtime = createRuntime(TV_BEHAVIOR, null, T0);
    let accepted = 0;

    // 20 clicks en 200 ms, con turn_on durando ~417 ms.
    for (let index = 0; index < 20; index++) {
      const outcome = applyTrigger(TV_BEHAVIOR, runtime, 'CLICK', T0 + index * 10);
      if (outcome.accepted) accepted++;
      runtime = outcome.runtime;
    }

    expect(accepted).toBe(1);
    expect(runtime.playing?.animationKey).toBe('turn_on');
    expect(runtime.playing?.startedAt).toBe(T0); // no se reinició

    runtime = tick(TV_BEHAVIOR, runtime, T0 + TURN_MS);
    expect(runtime.stateKey).toBe('ON');
  });

  it('los clicks rechazados devuelven el MISMO runtime', () => {
    // Identidad preservada para que el llamador pueda comparar con === y no
    // tocar el sprite ni emitir nada al servidor de balde.
    const runtime = applyTrigger(TV_BEHAVIOR, createRuntime(TV_BEHAVIOR, null, T0), 'CLICK', T0)
      .runtime;
    const ignored = applyTrigger(TV_BEHAVIOR, runtime, 'CLICK', T0 + 50);
    expect(ignored.accepted).toBe(false);
    expect(ignored.runtime).toBe(runtime);
    expect(ignored.resolution).toBeNull();
  });

  it('en cuanto la transición termina, vuelve a aceptar clicks', () => {
    let runtime = applyTrigger(TV_BEHAVIOR, createRuntime(TV_BEHAVIOR, null, T0), 'CLICK', T0)
      .runtime;
    runtime = tick(TV_BEHAVIOR, runtime, T0 + TURN_MS);
    expect(isBusy(runtime)).toBe(false);
    expect(applyTrigger(TV_BEHAVIOR, runtime, 'CLICK', T0 + TURN_MS).accepted).toBe(true);
  });

  it('un estado con loop activo NO bloquea: la bañera se puede parar', () => {
    const runtime = createRuntime(BATHTUB_BEHAVIOR, 'FILLING', T0);
    expect(isBusy(runtime)).toBe(false);
    expect(applyTrigger(BATHTUB_BEHAVIOR, runtime, 'CLICK', T0).accepted).toBe(true);
  });
});

describe('onComplete REPEAT', () => {
  const repeating: WorldBehavior = {
    version: 1,
    initialState: 'IDLE',
    states: [{ key: 'IDLE', animation: null }],
    animations: [
      {
        key: 'pulse',
        row: 0,
        startCol: 0,
        framesCount: 4,
        fps: 8, // 500 ms por pasada
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
        animation: 'pulse',
        onComplete: { action: 'REPEAT' },
      },
    ],
  };

  it('reinicia la animación por pasadas exactas, sin acumular desfase', () => {
    let runtime = applyTrigger(repeating, createRuntime(repeating, null, T0), 'CLICK', T0).runtime;
    expect(runtime.playing?.startedAt).toBe(T0);

    // Se detecta el final 30 ms tarde (un frame del juego): el arranque nuevo
    // igual queda en T0 + 500, no en T0 + 530.
    runtime = tick(repeating, runtime, T0 + 530);
    expect(runtime.playing?.startedAt).toBe(T0 + 500);
  });

  it('REPEAT no bloquea al objeto: nunca queda inutilizable', () => {
    const runtime = applyTrigger(repeating, createRuntime(repeating, null, T0), 'CLICK', T0)
      .runtime;
    expect(isBusy(runtime)).toBe(false);
    expect(applyTrigger(repeating, runtime, 'CLICK', T0 + 10).accepted).toBe(true);
  });
});

describe('applyRemoteState: sincronización multijugador', () => {
  it('otro jugador ve la animación de paso completa', () => {
    const runtime = createRuntime(TV_BEHAVIOR, 'OFF', T0);
    // El broadcast llega 40 ms después de que el servidor lo resolvió.
    const synced = applyRemoteState(
      TV_BEHAVIOR,
      runtime,
      { state: 'ON', via: 'turn_on', at: T0 },
      T0 + 40,
    );
    expect(synced.playing?.animationKey).toBe('turn_on');
    expect(synced.playing?.startedAt).toBe(T0); // cronometrada desde el servidor
    expect(synced.stateKey).toBe('OFF');

    expect(tick(TV_BEHAVIOR, synced, T0 + TURN_MS).stateKey).toBe('ON');
  });

  it('quien entra a la sala tarde salta directo al estado final', () => {
    // La animación ya terminó hace rato: no tiene sentido reproducirla.
    const runtime = createRuntime(TV_BEHAVIOR, 'OFF', T0);
    const synced = applyRemoteState(
      TV_BEHAVIOR,
      runtime,
      { state: 'ON', via: 'turn_on', at: T0 },
      T0 + 30_000,
    );
    expect(synced.playing).toBeNull();
    expect(synced.stateKey).toBe('ON');
  });

  it('sin animación de paso aplica el estado en el acto', () => {
    const synced = applyRemoteState(
      FOUNTAIN_BEHAVIOR,
      createRuntime(FOUNTAIN_BEHAVIOR, 'IDLE', T0),
      { state: 'FLOWING' },
      T0 + 10,
    );
    expect(synced.stateKey).toBe('FLOWING');
  });

  it('un estado remoto que este cliente no conoce cae al inicial', () => {
    // Cliente con una versión vieja del objeto: no se queda en blanco.
    const synced = applyRemoteState(
      TV_BEHAVIOR,
      createRuntime(TV_BEHAVIOR, 'ON', T0),
      { state: 'ESTADO_NUEVO' },
      T0,
    );
    expect(synced.stateKey).toBe('OFF');
  });

  it('si no cambia nada, devuelve el mismo runtime', () => {
    const runtime = createRuntime(TV_BEHAVIOR, 'ON', T0);
    expect(applyRemoteState(TV_BEHAVIOR, runtime, { state: 'ON' }, T0 + 5)).toBe(runtime);
  });

  it('un `at` inválido se trata como "ahora"', () => {
    const synced = applyRemoteState(
      TV_BEHAVIOR,
      createRuntime(TV_BEHAVIOR, 'OFF', T0),
      { state: 'ON', via: 'turn_on', at: null },
      T0 + 100,
    );
    expect(synced.playing?.startedAt).toBe(T0 + 100);
  });
});

describe('recarga de sala: salir y volver a entrar', () => {
  it('el objeto recupera el estado persistido, no el inicial', () => {
    // Se enciende la TV…
    let runtime = createRuntime(TV_BEHAVIOR, null, T0);
    runtime = tick(
      TV_BEHAVIOR,
      applyTrigger(TV_BEHAVIOR, runtime, 'CLICK', T0).runtime,
      T0 + TURN_MS,
    );
    const persisted = runtime.stateKey;
    expect(persisted).toBe('ON');

    // …se sale de la sala y se vuelve a entrar: el estado viene de RoomItem.state.
    const reloaded = createRuntime(TV_BEHAVIOR, persisted, T0 + 600_000);
    expect(reloaded.stateKey).toBe('ON');
    expect(reloaded.playing).toBeNull(); // sin repetir turn_on
    expect(activeAnimation(TV_BEHAVIOR, reloaded)?.animation.key).toBe('screen_loop');
  });

  it('no arrastra ninguna transición a medio camino', () => {
    const midway = applyTrigger(TV_BEHAVIOR, createRuntime(TV_BEHAVIOR, null, T0), 'CLICK', T0)
      .runtime;
    // Lo que se persiste es el estado estable resuelto por el servidor, así
    // que al recargar nunca se restaura un `playing`.
    const reloaded = createRuntime(TV_BEHAVIOR, resolveTrigger(TV_BEHAVIOR, 'OFF', 'CLICK')!.nextState, T0 + 1);
    expect(midway.playing).not.toBeNull();
    expect(reloaded.playing).toBeNull();
    expect(reloaded.stateKey).toBe('ON');
  });
});

describe('resolución defensiva de un estado que ya no existe', () => {
  it('resolveState cae al inicial y después al primero', () => {
    expect(resolveState(TV_BEHAVIOR, 'ON').key).toBe('ON');
    expect(resolveState(TV_BEHAVIOR, 'BORRADO').key).toBe('OFF');

    const noInitial: WorldBehavior = { ...TV_BEHAVIOR, initialState: 'FANTASMA' };
    expect(resolveState(noInitial, 'TAMPOCO').key).toBe('OFF');
  });

  it('el runtime de un estado borrado arranca en el inicial, sin romperse', () => {
    const runtime = createRuntime(TV_BEHAVIOR, 'ESTADO_DE_OTRA_VERSION', T0);
    expect(runtime.stateKey).toBe('OFF');
    expect(applyTrigger(TV_BEHAVIOR, runtime, 'CLICK', T0).accepted).toBe(true);
  });

  it('una transición cuya animación desapareció se asienta en vez de colgarse', () => {
    // Behavior recortado a mano (como si la versión nueva del objeto hubiera
    // borrado turn_on después de que este cliente ya la tenía en curso).
    const runtime: WorldObjectRuntime = {
      stateKey: 'OFF',
      stateSince: T0,
      playing: {
        animationKey: 'animacion_borrada',
        startedAt: T0,
        onComplete: { action: 'SET_STATE', state: 'ON' },
      },
    };
    const settled = tick(TV_BEHAVIOR, runtime, T0 + 10);
    expect(settled.playing).toBeNull();
    expect(settled.stateKey).toBe('ON');
  });

  it('createRuntimeFromRaw lee JSON crudo con basura extra', () => {
    const result = createRuntimeFromRaw({ ...TV_BEHAVIOR, campoRaro: 1 }, 'ON', T0);
    expect(result).not.toBeNull();
    expect(result!.runtime.stateKey).toBe('ON');
  });
});

describe('findTransition / hasTrigger', () => {
  it('encuentra la transición del par exacto', () => {
    expect(findTransition(TV_BEHAVIOR, 'OFF', 'CLICK')).toMatchObject({ animation: 'turn_on' });
    expect(findTransition(TV_BEHAVIOR, 'OFF', 'ROOM_ENTER')).toBeNull();
    expect(findTransition(TV_BEHAVIOR, 'NO_EXISTE', 'CLICK')).toBeNull();
  });

  it('hasTrigger decide si el juego intercepta el click del sprite', () => {
    expect(hasTrigger(TV_BEHAVIOR, 'CLICK')).toBe(true);
    // La palmera no reacciona al click: el clic tiene que seguir haciendo lo
    // de siempre (seleccionar / caminar), no quedarse sin efecto.
    expect(hasTrigger(PALM_BEHAVIOR, 'CLICK')).toBe(false);
    expect(hasTrigger(FOUNTAIN_BEHAVIOR, 'CLICK')).toBe(false);
    expect(hasTrigger(null, 'CLICK')).toBe(false);
  });
});
describe("fase del bucle tras una transicion (BUG de Fase 9)", () => {
  // El estado nuevo debe empezar a contar desde que la animacion TERMINO, no
  // desde el tick en que se detecto el final. Si dependiera de la deteccion,
  // la fase del bucle variaria con la cadencia del reloj de cada cliente: dos
  // jugadores mirando la misma TV verian `screen_loop` en frames distintos.

  it("tick: stateSince es el fin EXACTO, no el instante del tick", () => {
    let runtime = applyTrigger(TV_BEHAVIOR, createRuntime(TV_BEHAVIOR, null, T0), "CLICK", T0)
      .runtime;

    // Se detecta el final MUY tarde (un tick grueso, o una pestana en segundo
    // plano que no ejecuto rAF durante medio segundo).
    runtime = tick(TV_BEHAVIOR, runtime, T0 + 5_000);

    expect(runtime.stateKey).toBe("ON");
    expect(runtime.stateSince).toBeCloseTo(T0 + TURN_MS, 5);
    expect(runtime.stateSince).not.toBe(T0 + 5_000);
  });

  it("la fase del bucle NO depende de cada cuanto se tickee", () => {
    // Cliente A: ticks finos de 16 ms. Cliente B: un solo tick tardio.
    const start = createRuntime(TV_BEHAVIOR, null, T0);
    let fine = applyTrigger(TV_BEHAVIOR, start, "CLICK", T0).runtime;
    let coarse = applyTrigger(TV_BEHAVIOR, start, "CLICK", T0).runtime;

    for (let t = 16; t <= 1_000; t += 16) fine = tick(TV_BEHAVIOR, fine, T0 + t);
    coarse = tick(TV_BEHAVIOR, coarse, T0 + 1_000);

    expect(fine.stateSince).toBe(coarse.stateSince);

    const at = T0 + 1_000;
    const fineActive = activeAnimation(TV_BEHAVIOR, fine)!;
    const coarseActive = activeAnimation(TV_BEHAVIOR, coarse)!;
    expect(computeAnimationFrame(fineActive.animation, at - fineActive.startedAt).frame).toBe(
      computeAnimationFrame(coarseActive.animation, at - coarseActive.startedAt).frame,
    );
  });

  it("applyRemoteState: quien llega tarde entra en la MISMA fase del bucle", () => {
    // A hace click en T0. B recibe el evento 5 s despues (entro a la sala).
    // Si B contara desde su llegada, veria screen_loop reiniciado.
    let a = applyTrigger(TV_BEHAVIOR, createRuntime(TV_BEHAVIOR, null, T0), "CLICK", T0).runtime;
    a = tick(TV_BEHAVIOR, a, T0 + TURN_MS);

    const b = applyRemoteState(
      TV_BEHAVIOR,
      createRuntime(TV_BEHAVIOR, "OFF", T0 + 5_000),
      { state: "ON", via: "turn_on", at: T0 },
      T0 + 5_000,
    );

    expect(b.stateSince).toBe(a.stateSince);

    const at = T0 + 5_000;
    const aActive = activeAnimation(TV_BEHAVIOR, a)!;
    const bActive = activeAnimation(TV_BEHAVIOR, b)!;
    expect(computeAnimationFrame(aActive.animation, at - aActive.startedAt).frame).toBe(
      computeAnimationFrame(bActive.animation, at - bActive.startedAt).frame,
    );
  });

  it("sin animacion conocida se asienta con el instante actual", () => {
    // No hay duracion que sumar: `now` es lo unico disponible y es correcto.
    const runtime: WorldObjectRuntime = {
      stateKey: "OFF",
      stateSince: T0,
      playing: {
        animationKey: "animacion_borrada",
        startedAt: T0,
        onComplete: { action: "SET_STATE", state: "ON" },
      },
    };

    const settled = tick(TV_BEHAVIOR, runtime, T0 + 40);
    expect(settled.stateKey).toBe("ON");
    expect(settled.stateSince).toBe(T0 + 40);
  });
});
