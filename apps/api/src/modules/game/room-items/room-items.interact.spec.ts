import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  BATHTUB_BEHAVIOR,
  DOOR_BEHAVIOR,
  PALM_BEHAVIOR,
  TV_BEHAVIOR,
  readPersistedState,
} from '@codebuddies/world-objects';

import { RoomItemsService } from './room-items.service';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * `interactItem` — máquina de estados en el SERVIDOR.
 *
 * El cliente sólo manda "CLICK". Todo lo que se comprueba acá es que quien
 * decide el estado resultante es el servidor, que lo persistido distingue el
 * estado estable de la transición en curso, y que las interacciones de siempre
 * (TOGGLE, OPEN, SIT, LIE, DRINK, TELEPORT) no cambiaron en nada.
 */

// turn_on / turn_off: 5 frames a 12 fps ≈ 416,67 ms
const TURN_MS = (5 * 1000) / 12;
// water_start: 6 frames a 12 fps · water_stop: 5 a 12 · opening/closing: 6 a 14
const WATER_START_MS = (6 * 1000) / 12;
const WATER_STOP_MS = (5 * 1000) / 12;
const DOOR_MS = (6 * 1000) / 14;

describe('RoomItemsService.interactItem', () => {
  let service: RoomItemsService;

  const prisma = {
    roomItem: { findUnique: jest.fn(), update: jest.fn() },
    // Mejoras: por defecto el objeto no tiene ninguna (behavior completo).
    itemUpgrade: { findMany: jest.fn().mockResolvedValue([]) },
    userItemUpgrade: { findMany: jest.fn().mockResolvedValue([]) },
  };

  /** Deja la DB simulada con un objeto concreto y su estado. */
  function givenItem(options: {
    behavior?: unknown;
    state?: Record<string, unknown> | null;
    interactionTypes?: string[];
    isInteractable?: boolean;
  }) {
    const roomItem = {
      id: 'room-item-1',
      roomId: 'room-1',
      userId: 'owner-1',
      itemId: 'item-1',
      state: options.state ?? null,
      item: {
        worldData: {
          isInteractable: options.isInteractable ?? true,
          interactionTypes: options.interactionTypes ?? ['CLICK'],
          behavior: options.behavior ?? null,
        },
      },
    };
    prisma.roomItem.findUnique.mockResolvedValue(roomItem);
    // `update` devuelve la fila con el state nuevo, como haría Postgres.
    prisma.roomItem.update.mockImplementation(async ({ data }: any) => ({
      ...roomItem,
      state: data.state,
    }));
    return roomItem;
  }

  /** El bloque de behavior que quedó escrito en la base. */
  function writtenBehaviorState() {
    const data = prisma.roomItem.update.mock.calls[0]?.[0]?.data;
    return readPersistedState(data?.state);
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomItemsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<RoomItemsService>(RoomItemsService);
  });

  afterEach(() => jest.useRealTimers());

  /** Congela el reloj del servidor para poder razonar sobre `at`. */
  function freezeAt(epochMs: number) {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(epochMs);
    return epochMs;
  }

  // ─────────────────────────── objeto estático ───────────────────────────

  describe('behavior = null (objeto de siempre)', () => {
    it('CLICK se rechaza si el objeto no declara esa interacción', async () => {
      givenItem({ behavior: null, interactionTypes: ['TOGGLE'] });

      await expect(service.interactItem('u1', 'room-item-1', 'CLICK' as any)).rejects.toThrow(
        /no admite la interacción CLICK/,
      );
      expect(prisma.roomItem.update).not.toHaveBeenCalled();
    });

    it('CLICK declarado pero sin behavior configurado se rechaza con un mensaje claro', async () => {
      givenItem({ behavior: null, interactionTypes: ['CLICK'] });

      await expect(service.interactItem('u1', 'room-item-1', 'CLICK' as any)).rejects.toThrow(
        /no tiene un comportamiento configurado/,
      );
      expect(prisma.roomItem.update).not.toHaveBeenCalled();
    });

    it('un objeto no interactivo sigue rechazándose como antes', async () => {
      givenItem({ isInteractable: false });

      await expect(service.interactItem('u1', 'room-item-1', 'CLICK' as any)).rejects.toThrow(
        /no es interactivo/,
      );
    });

    it('un objeto que no existe sigue dando 404', async () => {
      prisma.roomItem.findUnique.mockResolvedValue(null);

      await expect(service.interactItem('u1', 'nope', 'CLICK' as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ────────────────────────────────── TV ──────────────────────────────────

  describe('TV: OFF ↔ ON', () => {
    it('OFF + CLICK ⇒ turn_on, y lo persistido sigue diciendo OFF', async () => {
      const now = freezeAt(1_700_000_000_000);
      givenItem({ behavior: TV_BEHAVIOR });

      const result = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);

      // El servidor decidió la transición; el cliente no propuso nada.
      expect(result.behavior).toEqual({ state: 'ON', via: 'turn_on', at: now });

      // Y lo guardado distingue estable de transición: durante turn_on la TV
      // TODAVÍA está OFF, con la transición apuntando a ON.
      expect(writtenBehaviorState()).toEqual({
        key: 'OFF',
        via: 'turn_on',
        to: 'ON',
        at: now,
      });
    });

    it('la animación NO se reproduce en el servidor: sólo se indica cuál', async () => {
      freezeAt(1_700_000_000_000);
      givenItem({ behavior: TV_BEHAVIOR });

      const result = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);

      expect(result.behavior?.via).toBe('turn_on');
      // No hay ningún temporizador pendiente en el servidor: la transición se
      // resuelve leyendo el dato, no esperando.
      expect(jest.getTimerCount()).toBe(0);
    });

    it('ON + CLICK ⇒ turn_off → OFF', async () => {
      const now = freezeAt(1_700_000_100_000);
      givenItem({
        behavior: TV_BEHAVIOR,
        state: { behavior: { key: 'ON', via: null, to: null, at: 1 } },
      });

      const result = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);

      expect(result.behavior).toEqual({ state: 'OFF', via: 'turn_off', at: now });
      expect(writtenBehaviorState()).toMatchObject({ key: 'ON', to: 'OFF' });
    });

    it('el ciclo completo OFF → ON → OFF', async () => {
      const start = freezeAt(1_700_000_000_000);

      givenItem({ behavior: TV_BEHAVIOR });
      await service.interactItem('u1', 'room-item-1', 'CLICK' as any);
      const afterFirst = prisma.roomItem.update.mock.calls[0][0].data.state;

      // Ya terminó turn_on: el estado efectivo es ON aunque nadie reescribió.
      jest.setSystemTime(start + TURN_MS + 10);
      jest.clearAllMocks();
      givenItem({ behavior: TV_BEHAVIOR, state: afterFirst });

      const second = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);
      expect(second.behavior).toMatchObject({ state: 'OFF', via: 'turn_off' });
    });
  });

  // ───────────────────────────────── bañera ─────────────────────────────────

  describe('bañera: el loop intermedio no bloquea', () => {
    it('IDLE + CLICK ⇒ water_start → FILLING', async () => {
      const now = freezeAt(1_700_000_000_000);
      givenItem({ behavior: BATHTUB_BEHAVIOR });

      const result = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);

      expect(result.behavior).toEqual({ state: 'FILLING', via: 'water_start', at: now });
      expect(writtenBehaviorState()).toMatchObject({ key: 'IDLE', to: 'FILLING' });
    });

    it('FILLING + CLICK ⇒ water_stop → IDLE, con el agua corriendo hace rato', async () => {
      // FILLING reproduce water_loop indefinidamente. Eso NO es una transición
      // pendiente, así que el segundo click tiene que entrar.
      const now = freezeAt(1_700_000_000_000);
      givenItem({
        behavior: BATHTUB_BEHAVIOR,
        state: { behavior: { key: 'FILLING', via: null, to: null, at: now - 600_000 } },
      });

      const result = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);

      expect(result.behavior).toEqual({ state: 'IDLE', via: 'water_stop', at: now });
    });

    it('el ciclo IDLE → FILLING → IDLE y vuelta a empezar', async () => {
      const start = freezeAt(1_700_000_000_000);

      givenItem({ behavior: BATHTUB_BEHAVIOR });
      await service.interactItem('u1', 'room-item-1', 'CLICK' as any);
      const filling = prisma.roomItem.update.mock.calls[0][0].data.state;

      // El agua lleva 5 s corriendo: water_start ya terminó, water_loop sigue.
      jest.setSystemTime(start + WATER_START_MS + 5_000);
      jest.clearAllMocks();
      givenItem({ behavior: BATHTUB_BEHAVIOR, state: filling });

      await service.interactItem('u1', 'room-item-1', 'CLICK' as any);
      const closing = prisma.roomItem.update.mock.calls[0][0].data.state;
      expect(readPersistedState(closing)).toMatchObject({
        key: 'FILLING',
        via: 'water_stop',
        to: 'IDLE',
      });

      // Terminado water_stop, vuelve a estar en IDLE y acepta abrir de nuevo.
      jest.setSystemTime(start + WATER_START_MS + 5_000 + WATER_STOP_MS);
      jest.clearAllMocks();
      givenItem({ behavior: BATHTUB_BEHAVIOR, state: closing });

      const reopen = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);
      expect(reopen.behavior).toMatchObject({ state: 'FILLING', via: 'water_start' });
    });

    it('durante water_start el segundo click SÍ se ignora', async () => {
      const now = freezeAt(1_700_000_000_000);
      givenItem({
        behavior: BATHTUB_BEHAVIOR,
        state: { behavior: { key: 'IDLE', via: 'water_start', to: 'FILLING', at: now - 50 } },
      });

      const result = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);

      expect((result as any).changed).toBe(false);
      expect(prisma.roomItem.update).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────── puerta ──────────────────────────────────

  describe('puerta: CLOSED ↔ OPEN', () => {
    it('CLOSED + CLICK ⇒ opening → OPEN', async () => {
      const now = freezeAt(1_700_000_000_000);
      givenItem({ behavior: DOOR_BEHAVIOR });

      const result = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);
      expect(result.behavior).toEqual({ state: 'OPEN', via: 'opening', at: now });
    });

    it('OPEN + CLICK ⇒ closing → CLOSED', async () => {
      const now = freezeAt(1_700_000_000_000);
      givenItem({
        behavior: DOOR_BEHAVIOR,
        state: { behavior: { key: 'OPEN', via: null, to: null, at: 1 } },
      });

      const result = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);
      expect(result.behavior).toEqual({ state: 'CLOSED', via: 'closing', at: now });
    });

    it('OPENING nunca se persiste como estado: sólo CLOSED y OPEN', async () => {
      // Si "abriéndose" fuera un estado guardado y el cliente que la abrió se
      // desconectara, la puerta quedaría a medias para toda la sala.
      freezeAt(1_700_000_000_000);
      givenItem({ behavior: DOOR_BEHAVIOR });

      await service.interactItem('u1', 'room-item-1', 'CLICK' as any);

      const persisted = writtenBehaviorState()!;
      expect(['CLOSED', 'OPEN']).toContain(persisted.key);
      expect(['CLOSED', 'OPEN']).toContain(persisted.to);
    });
  });

  // ──────────────────────────── transición inválida ────────────────────────────

  describe('CLICK sin transición: no-op seguro', () => {
    it('la palmera no reacciona al click y no se escribe nada', async () => {
      freezeAt(1_700_000_000_000);
      givenItem({ behavior: PALM_BEHAVIOR });

      const result = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);

      expect((result as any).changed).toBe(false);
      expect(prisma.roomItem.update).not.toHaveBeenCalled();
    });

    it('un estado guardado que ya no existe cae al inicial y funciona', async () => {
      const now = freezeAt(1_700_000_000_000);
      givenItem({
        behavior: TV_BEHAVIOR,
        state: { behavior: { key: 'DE_OTRA_VERSION', via: null, to: null, at: 1 } },
      });

      const result = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);
      // Cae a OFF (el inicial) y desde ahí la transición sí existe.
      expect(result.behavior).toEqual({ state: 'ON', via: 'turn_on', at: now });
    });

    it('un behavior corrupto se trata como objeto sin comportamiento', async () => {
      givenItem({ behavior: { version: 1, states: 'no-soy-un-array' } });

      await expect(service.interactItem('u1', 'room-item-1', 'CLICK' as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.roomItem.update).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────── click spam ───────────────────────────────

  describe('click spam: 20 clicks seguidos', () => {
    it('producen UNA sola transición y UNA sola escritura', async () => {
      const start = freezeAt(1_700_000_000_000);

      // Se simula la base de verdad: cada click lee lo que dejó el anterior.
      let state: any = null;
      prisma.roomItem.findUnique.mockImplementation(async () => ({
        id: 'room-item-1',
        roomId: 'room-1',
        state,
        item: {
          worldData: {
            isInteractable: true,
            interactionTypes: ['CLICK'],
            behavior: TV_BEHAVIOR,
          },
        },
      }));
      prisma.roomItem.update.mockImplementation(async ({ data }: any) => {
        state = data.state;
        return { id: 'room-item-1', roomId: 'room-1', state };
      });

      const accepted: any[] = [];
      for (let index = 0; index < 20; index++) {
        // 20 clicks en 200 ms, con turn_on durando ~417 ms.
        jest.setSystemTime(start + index * 10);
        const result = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);
        if ((result as any).changed) accepted.push(result);
      }

      expect(accepted).toHaveLength(1);
      expect(prisma.roomItem.update).toHaveBeenCalledTimes(1);
      expect(readPersistedState(state)).toEqual({
        key: 'OFF',
        via: 'turn_on',
        to: 'ON',
        at: start,
      });
    });

    it('el spam de OTRO jugador tampoco rompe la transición en curso', async () => {
      // La protección sale del dato persistido, así que vale para toda la sala
      // y no depende de qué socket mandó el click.
      const now = freezeAt(1_700_000_000_000);
      givenItem({
        behavior: TV_BEHAVIOR,
        state: { behavior: { key: 'OFF', via: 'turn_on', to: 'ON', at: now - 100 } },
      });

      for (const user of ['jugador-b', 'jugador-c']) {
        const result = await service.interactItem(user, 'room-item-1', 'CLICK' as any);
        expect((result as any).changed).toBe(false);
      }
      expect(prisma.roomItem.update).not.toHaveBeenCalled();
    });

    it('en cuanto la transición termina, vuelve a aceptar clicks', async () => {
      const now = freezeAt(1_700_000_000_000);
      givenItem({
        behavior: TV_BEHAVIOR,
        state: { behavior: { key: 'OFF', via: 'turn_on', to: 'ON', at: now - TURN_MS } },
      });

      const result = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);
      // Ya asentó en ON, así que el click siguiente la apaga.
      expect(result.behavior).toMatchObject({ state: 'OFF', via: 'turn_off' });
    });
  });

  // ─────────────────────── compatibilidad con lo anterior ───────────────────────

  describe('interacciones de siempre: sin una sola regresión', () => {
    it('TOGGLE sigue alternando state.on', async () => {
      givenItem({ behavior: null, interactionTypes: ['TOGGLE'], state: { on: false } });

      const result = await service.interactItem('u1', 'room-item-1', 'TOGGLE' as any);

      expect(result.state).toEqual({ on: true });
      expect(prisma.roomItem.update).toHaveBeenCalledTimes(1);
      // Y no aparece ninguna clave nueva.
      expect('behavior' in (result.state as object)).toBe(false);
    });

    it('OPEN sigue alternando state.open', async () => {
      givenItem({ behavior: null, interactionTypes: ['OPEN'], state: { open: true } });

      const result = await service.interactItem('u1', 'room-item-1', 'OPEN' as any);
      expect(result.state).toEqual({ open: false });
    });

    it.each(['SIT', 'LIE', 'DRINK'])(
      '%s sigue sin persistir estado (lo resuelve el cliente)',
      async (interaction) => {
        givenItem({ behavior: null, interactionTypes: [interaction], state: { on: true } });

        const result = await service.interactItem('u1', 'room-item-1', interaction as any);

        expect(result.state).toEqual({ on: true });
        expect(prisma.roomItem.update).not.toHaveBeenCalled();
      },
    );

    it('TELEPORT sigue sin persistir estado', async () => {
      givenItem({ behavior: null, interactionTypes: ['TELEPORT'] });

      await service.interactItem('u1', 'room-item-1', 'TELEPORT' as any);
      expect(prisma.roomItem.update).not.toHaveBeenCalled();
    });

    it('TOGGLE sobre un objeto que ADEMÁS tiene behavior no toca el bloque nuevo', async () => {
      // Los dos sistemas conviven en el mismo objeto sin pisarse.
      givenItem({
        behavior: TV_BEHAVIOR,
        interactionTypes: ['TOGGLE', 'CLICK'],
        state: { on: false, behavior: { key: 'ON', via: null, to: null, at: 1 } },
      });

      const result = await service.interactItem('u1', 'room-item-1', 'TOGGLE' as any);

      expect((result.state as any).on).toBe(true);
      expect((result.state as any).behavior).toEqual({
        key: 'ON',
        via: null,
        to: null,
        at: 1,
      });
    });

    it('CLICK preserva las claves legacy del state', async () => {
      const now = freezeAt(1_700_000_000_000);
      givenItem({
        behavior: TV_BEHAVIOR,
        state: { on: true, open: false, algoViejo: 'x' },
      });

      await service.interactItem('u1', 'room-item-1', 'CLICK' as any);

      const written = prisma.roomItem.update.mock.calls[0][0].data.state;
      expect(written).toMatchObject({ on: true, open: false, algoViejo: 'x' });
      expect(written.behavior).toMatchObject({ key: 'OFF', to: 'ON', at: now });
    });
  });

  // ─────────────────────────── mejoras ───────────────────────────

  describe('mejoras desbloqueables', () => {
    it('una TV sin la mejora "Encendido" no prende (no-op, no escribe)', async () => {
      givenItem({ behavior: TV_BEHAVIOR, state: null });
      prisma.itemUpgrade.findMany.mockResolvedValueOnce([{ id: 'up-on', unlockStates: ['ON'] }]);
      prisma.userItemUpgrade.findMany.mockResolvedValueOnce([]);

      const result: any = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);

      expect(result.changed).toBe(false);
      expect(prisma.roomItem.update).not.toHaveBeenCalled();
    });

    it('con la mejora comprada por el dueño, la TV prende', async () => {
      givenItem({ behavior: TV_BEHAVIOR, state: null });
      prisma.itemUpgrade.findMany.mockResolvedValueOnce([{ id: 'up-on', unlockStates: ['ON'] }]);
      prisma.userItemUpgrade.findMany.mockResolvedValueOnce([{ upgradeId: 'up-on' }]);

      const result: any = await service.interactItem('u1', 'room-item-1', 'CLICK' as any);

      expect(result.changed).toBe(true);
      expect(prisma.userItemUpgrade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'owner-1' }) }),
      );
    });
  });
});
