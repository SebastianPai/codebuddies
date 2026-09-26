import { BadRequestException } from '@nestjs/common';
import { InteractionType, Prisma } from '@prisma/client';
import { TV_BEHAVIOR, PALM_BEHAVIOR } from '@codebuddies/world-objects';

import {
  buildBehaviorData,
  buildInteractionTypesData,
  normalizeBehaviorForWrite,
} from './world-behavior.util';

/**
 * Puerta de escritura del `behavior`. Las tres entradas posibles significan
 * cosas distintas y no se pueden confundir:
 *
 *   undefined → no tocar la columna (update parcial)
 *   null      → limpiarla (objeto estático)
 *   objeto    → validar en estricto
 */
describe('normalizeBehaviorForWrite', () => {
  it('undefined ⇒ undefined: la columna no se toca', () => {
    // Es lo que impide que un PATCH que sólo cambia el precio borre la
    // máquina de estados de una TV ya configurada.
    expect(normalizeBehaviorForWrite(undefined)).toBeUndefined();
  });

  it('null ⇒ Prisma.JsonNull: el objeto vuelve a ser estático', () => {
    expect(normalizeBehaviorForWrite(null)).toBe(Prisma.JsonNull);
  });

  it('acepta un behavior válido y guarda la salida NORMALIZADA, no la entrada', () => {
    // El objeto que llega omite `directional` y `spriteSheetUrl`; lo que se
    // persiste los tiene explícitos. Así el motor nunca lee un campo ausente.
    const incoming = {
      version: 1,
      initialState: 'IDLE',
      states: [{ key: 'IDLE', animation: 'idle_loop' }],
      animations: [
        {
          key: 'idle_loop',
          row: 0,
          startCol: 0,
          framesCount: 4,
          fps: 6,
          loop: true,
        },
      ],
      transitions: [],
    };

    const stored = normalizeBehaviorForWrite(incoming) as any;

    expect(stored.animations[0]).toEqual({
      key: 'idle_loop',
      row: 0,
      startCol: 0,
      framesCount: 4,
      fps: 6,
      loop: true,
      directional: true,
      spriteSheetUrl: null,
    });
  });

  it('acepta los behaviors de referencia (TV, palmera)', () => {
    expect(normalizeBehaviorForWrite(TV_BEHAVIOR)).toEqual(TV_BEHAVIOR);
    expect(normalizeBehaviorForWrite(PALM_BEHAVIOR)).toEqual(PALM_BEHAVIOR);
  });

  it('rechaza un behavior inválido con 400 y la lista de errores', () => {
    let caught: any;
    try {
      normalizeBehaviorForWrite({ ...TV_BEHAVIOR, initialState: 'NO_EXISTE' });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    const response = caught.getResponse();
    expect(response.message).toBe('Comportamiento del objeto inválido');
    expect(response.errors).toContain(
      'behavior.initialState: "NO_EXISTE" no existe en states',
    );
  });

  it('rechaza propiedades desconocidas en vez de ignorarlas', () => {
    // El punto de seguridad: nada que no esté en el contrato llega a la base.
    expect(() =>
      normalizeBehaviorForWrite({ ...TV_BEHAVIOR, script: 'alert(1)' }),
    ).toThrow(BadRequestException);
  });

  it('rechaza un trigger declarado pero no implementado', () => {
    expect(() =>
      normalizeBehaviorForWrite({
        ...TV_BEHAVIOR,
        transitions: [
          {
            trigger: 'PROXIMITY',
            fromState: 'OFF',
            action: 'SET_STATE',
            state: 'ON',
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza límites excedidos', () => {
    expect(() =>
      normalizeBehaviorForWrite({
        version: 1,
        initialState: 'IDLE',
        states: [{ key: 'IDLE', animation: 'too_long' }],
        animations: [
          {
            key: 'too_long',
            row: 0,
            startCol: 0,
            framesCount: 999,
            fps: 12,
            loop: true,
          },
        ],
        transitions: [],
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza un behavior que no es objeto', () => {
    expect(() => normalizeBehaviorForWrite('turn_on')).toThrow(
      BadRequestException,
    );
    expect(() => normalizeBehaviorForWrite(42)).toThrow(BadRequestException);
  });
});

describe('buildBehaviorData', () => {
  it('sin behavior devuelve {} — el spread no agrega la clave', () => {
    // `{ ...buildBehaviorData(undefined) }` tiene que dejar el `data` de
    // Prisma exactamente como estaba.
    expect(buildBehaviorData(undefined)).toEqual({});
    expect(Object.keys({ width: 1, ...buildBehaviorData(undefined) })).toEqual([
      'width',
    ]);
  });

  it('null agrega la clave con JsonNull', () => {
    expect(buildBehaviorData(null)).toEqual({ behavior: Prisma.JsonNull });
  });

  it('un behavior válido agrega la clave con el valor normalizado', () => {
    expect(buildBehaviorData(TV_BEHAVIOR)).toEqual({ behavior: TV_BEHAVIOR });
  });
});

/**
 * `buildInteractionTypesData` — Fase 11 (bug real de la QA de navegador).
 *
 * `RoomItemsService#interactItem` exige `isInteractable` Y que
 * `interactionTypes` incluya la interacción ANTES de mirar `behavior`
 * (ver el gate al principio de ese método). El editor de comportamiento
 * (ItemsService) nunca tocaba esas dos columnas, así que un TV con un click
 * perfectamente configurado no reaccionaba en la sala. Esta es la corrección:
 * añadir CLICK cuando el behavior lo declara, sin tocar nada que el admin ya
 * hubiera puesto a mano.
 */
describe('buildInteractionTypesData', () => {
  const tvClick = normalizeBehaviorForWrite(TV_BEHAVIOR);
  const palmSinClick = normalizeBehaviorForWrite(PALM_BEHAVIOR);

  it('un behavior sin ninguna transición CLICK no toca nada', () => {
    expect(
      buildInteractionTypesData(palmSinClick, {
        isInteractable: false,
        interactionTypes: [],
      }),
    ).toEqual({});
  });

  it('sin behavior (undefined/JsonNull) no toca nada', () => {
    expect(
      buildInteractionTypesData(undefined, {
        isInteractable: false,
        interactionTypes: [],
      }),
    ).toEqual({});
    expect(
      buildInteractionTypesData(Prisma.JsonNull, {
        isInteractable: false,
        interactionTypes: [],
      }),
    ).toEqual({});
  });

  it('un TV recién creado (isInteractable=false, sin interactionTypes) enciende las dos columnas', () => {
    // Este es EXACTAMENTE el caso que encontró la QA de navegador: un item
    // nuevo, con behavior CLICK, creado por /admin/items o
    // /creator/marketplace, donde nadie tocó "Interactuable".
    expect(
      buildInteractionTypesData(tvClick, {
        isInteractable: false,
        interactionTypes: [],
      }),
    ).toEqual({
      interactionTypes: [InteractionType.CLICK],
      isInteractable: true,
    });
  });

  it('un objeto legacy con TOGGLE conserva su interactionType al agregar CLICK', () => {
    expect(
      buildInteractionTypesData(tvClick, {
        isInteractable: true,
        interactionTypes: [InteractionType.TOGGLE],
      }),
    ).toEqual({
      interactionTypes: [InteractionType.TOGGLE, InteractionType.CLICK],
    });
  });

  it('si ya está todo prendido, no repite CLICK ni vuelve a escribir isInteractable', () => {
    expect(
      buildInteractionTypesData(tvClick, {
        isInteractable: true,
        interactionTypes: [InteractionType.CLICK],
      }),
    ).toEqual({});
  });

  it('isInteractable ya en true pero sin CLICK en la lista: sólo agrega la lista', () => {
    expect(
      buildInteractionTypesData(tvClick, {
        isInteractable: true,
        interactionTypes: [],
      }),
    ).toEqual({ interactionTypes: [InteractionType.CLICK] });
  });

  it('existing ausente (create desde cero) se trata como todo apagado', () => {
    expect(buildInteractionTypesData(tvClick, {})).toEqual({
      interactionTypes: [InteractionType.CLICK],
      isInteractable: true,
    });
  });

  it('nunca QUITA una interactionType legacy que ya hubiera', () => {
    const result = buildInteractionTypesData(tvClick, {
      isInteractable: true,
      interactionTypes: [InteractionType.OPEN, InteractionType.SIT],
    });
    expect(result).toMatchObject({
      interactionTypes: expect.arrayContaining([
        InteractionType.OPEN,
        InteractionType.SIT,
        InteractionType.CLICK,
      ]),
    });
    expect(
      (result as { interactionTypes: InteractionType[] }).interactionTypes,
    ).toHaveLength(3);
  });
});
