import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PlayerHandler } from './player.handler';
import { AvatarService } from '../../avatar/avatar.service';
import { PlayerService } from '../../player/player.service';
import { EnergyService } from '../../energy/energy.service';
import { PrismaService } from '../../../../prisma/prisma.service';

describe('PlayerHandler — broadcastNameEffectUpdate', () => {
  let handler: PlayerHandler;
  const server = { to: jest.fn().mockReturnThis(), emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerHandler,
        { provide: JwtService, useValue: {} },
        { provide: AvatarService, useValue: {} },
        { provide: PlayerService, useValue: {} },
        { provide: EnergyService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    handler = module.get<PlayerHandler>(PlayerHandler);
  });

  // userToSocketId es privado -- se llena normalmente en handleConnection.
  // Acá se simula directamente el estado post-conexión para no tener que
  // mockear JWT/avatar/DB completos solo para probar el broadcast.
  function seedConnectedPlayer(userId: string, socketId: string, room: string) {
    (handler as any).userToSocketId.set(userId, socketId);
    handler.players[socketId] = {
      id: socketId,
      x: 0,
      y: 0,
      room,
      username: 'tester',
      avatar: {} as any,
    };
  }

  it("emits playerNameEffectUpdated to the player's current room with the correct payload", () => {
    seedConnectedPlayer('user-1', 'socket-1', 'room-abc');

    const result = handler.broadcastNameEffectUpdate(server as any, 'user-1', 'fire');

    expect(result).toBe(true);
    expect(server.to).toHaveBeenCalledWith('room-abc');
    expect(server.emit).toHaveBeenCalledWith('playerNameEffectUpdated', {
      playerId: 'socket-1',
      nameEffectId: 'fire',
    });
    expect(handler.players['socket-1'].nameEffectId).toBe('fire');
    expect(handler.userNameEffects['user-1']).toBe('fire');
  });

  it('returns false and does not emit when the user has no active socket', () => {
    const result = handler.broadcastNameEffectUpdate(server as any, 'ghost-user', 'gold');

    expect(result).toBe(false);
    expect(server.to).not.toHaveBeenCalled();
    expect(server.emit).not.toHaveBeenCalled();
    // Igual cachea el valor -- el próximo buildPlayer() (join/reconexión)
    // ya lo lee de acá en vez de pegarle a la DB otra vez.
    expect(handler.userNameEffects['ghost-user']).toBe('gold');
  });

  it('returns false when the user is connected but not currently inside any room', () => {
    (handler as any).userToSocketId.set('user-2', 'socket-2');
    // Sin entrada en handler.players -> conectado, pero sin sala todavía.

    const result = handler.broadcastNameEffectUpdate(server as any, 'user-2', 'ice');

    expect(result).toBe(false);
    expect(server.to).not.toHaveBeenCalled();
  });

  it('propagates clearing the effect back to null', () => {
    seedConnectedPlayer('user-3', 'socket-3', 'room-xyz');

    const result = handler.broadcastNameEffectUpdate(server as any, 'user-3', null);

    expect(result).toBe(true);
    expect(server.emit).toHaveBeenCalledWith('playerNameEffectUpdated', {
      playerId: 'socket-3',
      nameEffectId: null,
    });
  });

  it('only targets the room the changing player is in, not other rooms', () => {
    seedConnectedPlayer('user-4', 'socket-4', 'room-only-mine');

    handler.broadcastNameEffectUpdate(server as any, 'user-4', 'crystal');

    expect(server.to).toHaveBeenCalledTimes(1);
    expect(server.to).toHaveBeenCalledWith('room-only-mine');
  });
});
