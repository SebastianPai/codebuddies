import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TV_BEHAVIOR } from '@codebuddies/world-objects';

import { WorldItemDataService } from './world-item-data.service';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * `PATCH /world-item-data/:itemId` — la config avanzada de /admin/world-items.
 *
 * Además del behavior, acá se fija la semántica de update PARCIAL: lo que el
 * DTO no trae no se toca. Es lo que impide que tocar un checkbox de colisión
 * le borre a un objeto su máquina de estados.
 */
describe('WorldItemDataService', () => {
  let service: WorldItemDataService;

  const existing = {
    itemId: 'item-tv',
    width: 512,
    height: 128,
    footprintWidth: 1,
    footprintHeight: 1,
    directions: 4,
    footprints: null,
    surfaces: null,
    spriteOffsets: null,
    spriteOffsetSync: 'mirror',
    spriteOffsetX: 0,
    spriteOffsetY: 0,
    behavior: TV_BEHAVIOR,
  };

  const prisma = {
    worldItemData: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.worldItemData.findUnique.mockResolvedValue(existing);
    prisma.worldItemData.update.mockImplementation(async ({ data }: any) => data);

    const module: TestingModule = await Test.createTestingModule({
      providers: [WorldItemDataService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<WorldItemDataService>(WorldItemDataService);
  });

  /** El `data` que el servicio le pasó a Prisma. */
  function writtenData() {
    return prisma.worldItemData.update.mock.calls[0][0].data;
  }

  it('un PATCH sin behavior NO toca la columna', async () => {
    await service.update('item-tv', { isCollidable: true });

    const data = writtenData();
    expect(data.isCollidable).toBe(true);
    // Clave ausente = Prisma deja el JSON como está. Un item ya configurado
    // sobrevive a que un admin cambie cualquier otro campo.
    expect('behavior' in data).toBe(false);
  });

  it('guarda un behavior válido', async () => {
    await service.update('item-tv', { behavior: TV_BEHAVIOR as any });

    expect(writtenData().behavior).toEqual(TV_BEHAVIOR);
  });

  it('guarda la versión NORMALIZADA, no el objeto crudo del cliente', async () => {
    await service.update('item-tv', {
      behavior: {
        version: 1,
        initialState: 'IDLE',
        states: [{ key: 'IDLE', animation: 'loop' }],
        animations: [{ key: 'loop', row: 0, startCol: 0, framesCount: 4, fps: 8, loop: true }],
        transitions: [],
      },
    });

    expect(writtenData().behavior.animations[0].directional).toBe(true);
    expect(writtenData().behavior.animations[0].spriteSheetUrl).toBeNull();
  });

  it('behavior: null limpia la columna y el objeto vuelve a ser estático', async () => {
    await service.update('item-tv', { behavior: null });

    expect(writtenData().behavior).toBe(Prisma.JsonNull);
  });

  it('rechaza un behavior inválido sin escribir nada', async () => {
    await expect(
      service.update('item-tv', {
        behavior: { version: 1, initialState: 'NOPE', states: [], animations: [], transitions: [] },
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.worldItemData.update).not.toHaveBeenCalled();
  });

  it('rechaza propiedades desconocidas dentro del behavior', async () => {
    await expect(
      service.update('item-tv', {
        behavior: { ...(TV_BEHAVIOR as any), script: 'fetch("/steal")' },
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.worldItemData.update).not.toHaveBeenCalled();
  });

  it('el behavior crudo del DTO nunca llega a Prisma por el spread', async () => {
    // El servicio hace `{ ...dto }`; si `behavior` viajara por ahí, se
    // persistiría sin validar. Se saca del spread a propósito.
    await service.update('item-tv', {
      behavior: { ...(TV_BEHAVIOR as any), initialState: 'ON' },
    });

    const stored = writtenData().behavior;
    expect(stored.initialState).toBe('ON');
    // Y lo guardado es la salida del validador: animaciones completas.
    expect(stored.animations).toHaveLength(4);
  });
});
