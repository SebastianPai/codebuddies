/**
 * Cálculo de frame según fps y tiempo transcurrido.
 *
 *   cd apps/api && npx jest --rootDir ../.. \
 *     --testMatch "**\/packages/world-objects/*.spec.ts"
 */

import {
  animationCell,
  animationDurationMs,
  animationRowSpan,
  clampFps,
  computeAnimationFrame,
  WORLD_OBJECT_LIMITS as L,
  type WorldAnimation,
} from './index';

function animation(overrides: Partial<WorldAnimation> = {}): WorldAnimation {
  return {
    key: 'anim',
    row: 0,
    startCol: 0,
    framesCount: 4,
    fps: 10, // 100 ms por frame
    loop: false,
    directional: true,
    spriteSheetUrl: null,
    ...overrides,
  };
}

describe('computeAnimationFrame: animación NO loop', () => {
  const turnOn = animation({ framesCount: 5, fps: 10, loop: false }); // 500 ms

  it.each([
    [0, 0],
    [99, 0],
    [100, 1],
    [250, 2],
    [399, 3],
    [400, 4],
    [499, 4],
  ])('a los %i ms muestra el frame %i', (elapsed, frame) => {
    expect(computeAnimationFrame(turnOn, elapsed).frame).toBe(frame);
  });

  it('no termina antes de que el último frame haya estado en pantalla', () => {
    // 5 frames a 10 fps = 500 ms. A los 499 el último recién se está viendo.
    expect(computeAnimationFrame(turnOn, 499).completed).toBe(false);
    expect(computeAnimationFrame(turnOn, 500).completed).toBe(true);
  });

  it('se queda en el último frame para siempre', () => {
    const late = computeAnimationFrame(turnOn, 60_000);
    expect(late.frame).toBe(4);
    expect(late.completed).toBe(true);
  });

  it('una animación de 1 frame es una pose quieta', () => {
    const still = animation({ framesCount: 1, fps: 1, loop: false });
    expect(computeAnimationFrame(still, 0).frame).toBe(0);
    expect(computeAnimationFrame(still, 10_000).frame).toBe(0);
  });
});

describe('computeAnimationFrame: animación en loop', () => {
  const waterLoop = animation({ framesCount: 4, fps: 8, loop: true }); // 125 ms/frame

  it.each([
    [0, 0],
    [124, 0],
    [125, 1],
    [375, 3],
    [500, 0], // vuelve a empezar
    [625, 1],
  ])('a los %i ms muestra el frame %i', (elapsed, frame) => {
    expect(computeAnimationFrame(waterLoop, elapsed).frame).toBe(frame);
  });

  it('nunca reporta completed', () => {
    // De esto depende que un onComplete SET_STATE sobre un loop sea un error
    // de validación y no un objeto colgado en producción.
    for (const elapsed of [0, 500, 5_000, 3_600_000]) {
      expect(computeAnimationFrame(waterLoop, elapsed).completed).toBe(false);
    }
  });
});

describe('computeAnimationFrame: entradas raras', () => {
  it('un elapsed negativo se trata como 0', () => {
    // Pasa de verdad: el reloj del cliente puede estar detrás del `at` que
    // mandó el servidor. Nunca puede salir un índice negativo.
    expect(computeAnimationFrame(animation(), -5_000).frame).toBe(0);
  });

  it.each([NaN, Infinity])('un elapsed %p se trata como 0', (elapsed) => {
    expect(computeAnimationFrame(animation(), elapsed).frame).toBe(0);
  });

  it('un fps fuera de rango se recorta en vez de dividir por cero', () => {
    const broken = animation({ fps: 0, framesCount: 3, loop: true });
    expect(Number.isFinite(computeAnimationFrame(broken, 1_000).frame)).toBe(true);
    expect(computeAnimationFrame(broken, 1_000).frame).toBe(1); // 1 fps
  });
});

describe('clampFps / animationDurationMs', () => {
  it('recorta al rango permitido', () => {
    expect(clampFps(0)).toBe(L.minFps);
    expect(clampFps(999)).toBe(L.maxFps);
    expect(clampFps(12)).toBe(12);
    expect(clampFps(NaN)).toBe(L.minFps);
  });

  it('la duración es framesCount / fps', () => {
    expect(animationDurationMs(animation({ framesCount: 5, fps: 10 }))).toBe(500);
    expect(animationDurationMs(animation({ framesCount: 24, fps: 12 }))).toBe(2_000);
  });
});

describe('animationCell: ubicación en el atlas', () => {
  it('la columna avanza con el frame desde startCol', () => {
    const anim = animation({ row: 4, startCol: 2 });
    expect(animationCell(anim, 0, 0)).toEqual({ row: 4, col: 2 });
    expect(animationCell(anim, 3, 0)).toEqual({ row: 4, col: 5 });
  });

  it('la fila avanza con la dirección si es directional', () => {
    const anim = animation({ row: 4, directional: true });
    expect(animationCell(anim, 0, 0).row).toBe(4);
    expect(animationCell(anim, 0, 3).row).toBe(7);
  });

  it('una animación no directional ignora la dirección', () => {
    const anim = animation({ row: 8, directional: false });
    expect(animationCell(anim, 1, 3)).toEqual({ row: 8, col: 1 });
  });

  it('nunca devuelve índices negativos', () => {
    const cell = animationCell(animation({ row: 0, startCol: 0 }), -3, -2);
    expect(cell.row).toBeGreaterThanOrEqual(0);
    expect(cell.col).toBeGreaterThanOrEqual(0);
  });

  it('reverse recorre las columnas del último frame al primero', () => {
    const anim = animation({ startCol: 2, framesCount: 4, reverse: true });
    expect([0, 1, 2, 3].map((frame) => animationCell(anim, frame).col)).toEqual([5, 4, 3, 2]);
  });
});

describe('animationRowSpan', () => {
  it('una animación directional ocupa una fila por dirección', () => {
    expect(animationRowSpan(animation({ directional: true }), 4)).toBe(4);
    expect(animationRowSpan(animation({ directional: true }), 1)).toBe(1);
  });

  it('una no directional ocupa siempre una fila', () => {
    expect(animationRowSpan(animation({ directional: false }), 4)).toBe(1);
  });
});
