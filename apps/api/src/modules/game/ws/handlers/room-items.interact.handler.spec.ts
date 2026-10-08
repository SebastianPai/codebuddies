import { TV_BEHAVIOR } from '@codebuddies/world-objects';

import { RoomItemsHandler } from './room-items.handler';

/**
 * Difusión de `room:item:state` y protección contra el spam en el borde.
 *
 * Lo que importa acá es que TODOS los de la sala reciben EL MISMO evento —
 * ninguno recalcula la transición por su cuenta — y que el payload de siempre
 * no cambió de forma.
 */
describe('RoomItemsHandler.interactItem', () => {
  let handler: RoomItemsHandler;
  let roomItemsService: { interactItem: jest.Mock };
  let emit: jest.Mock;
  let to: jest.Mock;
  let server: any;

  /** Socket con el `data` que usa el throttle. */
  function makeSocket() {
    return { data: {}, emit: jest.fn() } as any;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    emit = jest.fn();
    to = jest.fn(() => ({ emit }));
    server = { to };

    roomItemsService = { interactItem: jest.fn() };
    handler = new RoomItemsHandler(roomItemsService as any);
  });

  afterEach(() => jest.useRealTimers());

  const clickResult = (at: number) => ({
    roomItem: { id: 'item-1', roomId: 'room-1' },
    state: { behavior: { key: 'OFF', via: 'turn_on', to: 'ON', at } },
    interaction: 'CLICK',
    changed: true,
    behavior: { state: 'ON', via: 'turn_on', at },
  });

  describe('multiplayer', () => {
    it('difunde a LA SALA, no al socket que clickeó', async () => {
      roomItemsService.interactItem.mockResolvedValue(clickResult(1_700_000_000_000));

      await handler.interactItem(server, makeSocket(), 'jugador-a', {
        roomItemId: 'item-1',
        interaction: 'CLICK' as any,
      });

      expect(to).toHaveBeenCalledWith('room-1');
      expect(emit).toHaveBeenCalledTimes(1);
    });

    it('A, B y C reciben EXACTAMENTE el mismo evento', async () => {
      // Socket.IO manda una sola emisión a la room, así que "el mismo evento"
      // es literal: un único objeto para los tres. Ninguno decide su estado.
      const at = 1_700_000_000_000;
      roomItemsService.interactItem.mockResolvedValue(clickResult(at));

      await handler.interactItem(server, makeSocket(), 'jugador-a', {
        roomItemId: 'item-1',
        interaction: 'CLICK' as any,
      });

      const [eventName, payload] = emit.mock.calls[0];
      expect(eventName).toBe('room:item:state');
      expect(payload).toEqual({
        roomItemId: 'item-1',
        interaction: 'CLICK',
        state: { behavior: { key: 'OFF', via: 'turn_on', to: 'ON', at } },
        behavior: { state: 'ON', via: 'turn_on', at },
      });
    });

    it('el `at` que viaja es el del SERVIDOR', async () => {
      // De esto depende que todos calculen el mismo desfase de animación, con
      // independencia del reloj de cada máquina.
      const at = 1_700_000_012_345;
      roomItemsService.interactItem.mockResolvedValue(clickResult(at));

      await handler.interactItem(server, makeSocket(), 'jugador-a', {
        roomItemId: 'item-1',
        interaction: 'CLICK' as any,
      });

      expect(emit.mock.calls[0][1].behavior.at).toBe(at);
    });
  });

  describe('payload', () => {
    it('conserva la forma de siempre para TOGGLE', async () => {
      // Sin la clave `behavior`: el cliente viejo mezcla `state` por encima del
      // que ya tenía (FurnitureSocketSystem.handleItemState) y nada cambió.
      roomItemsService.interactItem.mockResolvedValue({
        roomItem: { id: 'item-1', roomId: 'room-1' },
        state: { on: true },
        interaction: 'TOGGLE',
      });

      await handler.interactItem(server, makeSocket(), 'u1', {
        roomItemId: 'item-1',
        interaction: 'TOGGLE' as any,
      });

      expect(emit.mock.calls[0][1]).toEqual({
        roomItemId: 'item-1',
        interaction: 'TOGGLE',
        state: { on: true },
      });
    });

    it('`state` sigue siendo el Json COMPLETO, no una clave suelta', async () => {
      const at = 1_700_000_000_000;
      roomItemsService.interactItem.mockResolvedValue({
        ...clickResult(at),
        state: { on: true, behavior: { key: 'OFF', via: 'turn_on', to: 'ON', at } },
      });

      await handler.interactItem(server, makeSocket(), 'u1', {
        roomItemId: 'item-1',
        interaction: 'CLICK' as any,
      });

      // Mandar `state: "ON"` rompería el merge del cliente y con él TOGGLE.
      expect(emit.mock.calls[0][1].state).toEqual({
        on: true,
        behavior: { key: 'OFF', via: 'turn_on', to: 'ON', at },
      });
    });
  });

  describe('no-op: nada que contar a la sala', () => {
    it('un CLICK que no cambió nada no se difunde', async () => {
      roomItemsService.interactItem.mockResolvedValue({
        roomItem: { id: 'item-1', roomId: 'room-1' },
        state: {},
        interaction: 'CLICK',
        changed: false,
        behavior: null,
      });

      await handler.interactItem(server, makeSocket(), 'u1', {
        roomItemId: 'item-1',
        interaction: 'CLICK' as any,
      });

      expect(emit).not.toHaveBeenCalled();
    });

    it('un error se le devuelve SÓLO a quien interactuó', async () => {
      const socket = makeSocket();
      roomItemsService.interactItem.mockRejectedValue(new Error('no es interactivo'));

      await handler.interactItem(server, socket, 'u1', {
        roomItemId: 'item-1',
        interaction: 'CLICK' as any,
      });

      expect(emit).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith('room:item:error', {
        message: 'no es interactivo',
      });
    });
  });

  describe('throttle por socket y objeto', () => {
    it('20 clicks instantáneos llegan al servicio una sola vez', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      jest.setSystemTime(1_700_000_000_000);

      roomItemsService.interactItem.mockResolvedValue(clickResult(1_700_000_000_000));
      const socket = makeSocket();

      for (let index = 0; index < 20; index++) {
        await handler.interactItem(server, socket, 'u1', {
          roomItemId: 'item-1',
          interaction: 'CLICK' as any,
        });
      }

      // El freno es sólo para no golpear la base 20 veces; la corrección la
      // da isTransitionInFlight() en el servicio.
      expect(roomItemsService.interactItem).toHaveBeenCalledTimes(1);
    });

    it('no bloquea a OTRO jugador sobre el mismo objeto', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      jest.setSystemTime(1_700_000_000_000);
      roomItemsService.interactItem.mockResolvedValue(clickResult(1_700_000_000_000));

      await handler.interactItem(server, makeSocket(), 'jugador-a', {
        roomItemId: 'item-1',
        interaction: 'CLICK' as any,
      });
      await handler.interactItem(server, makeSocket(), 'jugador-b', {
        roomItemId: 'item-1',
        interaction: 'CLICK' as any,
      });

      expect(roomItemsService.interactItem).toHaveBeenCalledTimes(2);
    });

    it('no bloquea otro objeto del mismo jugador', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      jest.setSystemTime(1_700_000_000_000);
      roomItemsService.interactItem.mockResolvedValue(clickResult(1_700_000_000_000));
      const socket = makeSocket();

      await handler.interactItem(server, socket, 'u1', {
        roomItemId: 'item-1',
        interaction: 'CLICK' as any,
      });
      await handler.interactItem(server, socket, 'item-2', {
        roomItemId: 'item-2',
        interaction: 'CLICK' as any,
      });

      expect(roomItemsService.interactItem).toHaveBeenCalledTimes(2);
    });

    it('deja pasar un doble click legítimo pasada la ventana', async () => {
      // La bañera se abre y se cierra; el freno no puede impedirlo.
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      const start = 1_700_000_000_000;
      jest.setSystemTime(start);
      roomItemsService.interactItem.mockResolvedValue(clickResult(start));
      const socket = makeSocket();

      await handler.interactItem(server, socket, 'u1', {
        roomItemId: 'item-1',
        interaction: 'CLICK' as any,
      });
      jest.setSystemTime(start + 200);
      await handler.interactItem(server, socket, 'u1', {
        roomItemId: 'item-1',
        interaction: 'CLICK' as any,
      });

      expect(roomItemsService.interactItem).toHaveBeenCalledTimes(2);
    });

    it('el registro del throttle vive en el socket, no en el handler', async () => {
      // Así se va solo al desconectarse: un Map a nivel de servicio sería una
      // fuga proporcional a cuánta gente pasó por el mundo.
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      jest.setSystemTime(1_700_000_000_000);
      roomItemsService.interactItem.mockResolvedValue(clickResult(1_700_000_000_000));

      const socket = makeSocket();
      await handler.interactItem(server, socket, 'u1', {
        roomItemId: 'item-1',
        interaction: 'CLICK' as any,
      });

      expect(socket.data.lastInteractAt).toEqual({ 'item-1': 1_700_000_000_000 });
    });
  });

  describe('behavior de referencia', () => {
    it('el evento transporta la animación declarada en el behavior', async () => {
      // Coherencia con el contrato: `via` es una clave que existe en
      // behavior.animations, no un nombre inventado por el servidor.
      const at = 1_700_000_000_000;
      roomItemsService.interactItem.mockResolvedValue(clickResult(at));

      await handler.interactItem(server, makeSocket(), 'u1', {
        roomItemId: 'item-1',
        interaction: 'CLICK' as any,
      });

      const via = emit.mock.calls[0][1].behavior.via;
      expect(TV_BEHAVIOR.animations.map((animation) => animation.key)).toContain(via);
    });
  });
});
