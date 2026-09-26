import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { BackgroundsService } from '../backgrounds/backgrounds.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { FriendshipsService } from '../../friendships/friendships.service';

/**
 * Fase 11.5-B — bug real encontrado en QA de navegador: el cliente emite
 * `joinRoom` desde DOS sitios para la MISMA entrada a una sala (Game.tsx al
 * hacer click en "ENTRAR" y, aparte, LobbyScene al arrancar la escena
 * leyendo `game.roomId`), y esas dos llamadas casi simultáneas pueden ambas
 * intentar crear la misma fila de `RoomUser` — reproducido de verdad en el
 * navegador (captura: modal "Invalid `this.prisma.roomUser.upsert()`
 * invocation ... Unique constraint failed on the fields: (`roomId`,`userId`)").
 */
function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6.0.0',
  });
}

describe('RoomsService#joinRoom', () => {
  let service: RoomsService;

  const prisma = {
    roomUser: {
      upsert: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BackgroundsService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: FriendshipsService, useValue: {} },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  it('crea/actualiza la fila normalmente cuando no hay carrera', async () => {
    const row = { roomId: 'room-1', userId: 'user-1', x: 100, y: 100 };
    prisma.roomUser.upsert.mockResolvedValue(row);

    const result = await service.joinRoom('user-1', 'room-1');

    expect(result).toBe(row);
    expect(prisma.roomUser.upsert).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'room-1', userId: 'user-1' } },
      update: {},
      create: {
        roomId: 'room-1',
        userId: 'user-1',
        x: 100,
        y: 100,
        direction: 'SOUTH',
        role: 'VISITOR',
      },
    });
    expect(prisma.roomUser.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('dos joinRoom casi simultáneos (P2002) no revientan: el segundo devuelve la fila ya creada por el primero', async () => {
    const row = { roomId: 'room-1', userId: 'user-1', x: 100, y: 100 };
    prisma.roomUser.upsert.mockRejectedValue(uniqueConstraintError());
    prisma.roomUser.findUniqueOrThrow.mockResolvedValue(row);

    const result = await service.joinRoom('user-1', 'room-1');

    expect(result).toBe(row);
    expect(prisma.roomUser.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'room-1', userId: 'user-1' } },
    });
  });

  it('cualquier otro error de Prisma se propaga tal cual (no se traga errores reales)', async () => {
    const otherError = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003',
      clientVersion: '6.0.0',
    });
    prisma.roomUser.upsert.mockRejectedValue(otherError);

    await expect(service.joinRoom('user-1', 'room-1')).rejects.toBe(otherError);
    expect(prisma.roomUser.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
