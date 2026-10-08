import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TV_BEHAVIOR } from '@codebuddies/world-objects';
import { ItemUpgradesService } from './item-upgrades.service';

function makePrisma() {
  const tx = {
    userItemUpgrade: { create: jest.fn().mockResolvedValue({ id: 'p1' }) },
    user: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    coinTransaction: { create: jest.fn() },
    creatorWallet: { upsert: jest.fn().mockResolvedValue({ id: 'w1', availableBalance: 80 }) },
    creatorWalletMovement: { create: jest.fn() },
  };
  const prisma = {
    itemUpgrade: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'up-on', itemId: 'tv', key: 'encendido', name: 'Encendido', priceCoins: 100,
        unlockStates: ['ON'], requiresId: null, active: true,
      }),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async ({ data }: any) => data),
    },
    userItemUpgrade: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    userItem: { findFirst: jest.fn().mockResolvedValue({ id: 'inv' }) },
    roomItem: { findFirst: jest.fn().mockResolvedValue(null) },
    marketplaceContent: { findFirst: jest.fn().mockResolvedValue(null) },
    marketplaceSettings: { findUnique: jest.fn().mockResolvedValue({ commissionRate: 20 }) },
    item: { findUnique: jest.fn().mockResolvedValue({ id: 'tv', worldData: { behavior: TV_BEHAVIOR } }) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { prisma, tx };
}

describe('ItemUpgradesService', () => {
  it('no deja comprar la mejora de un objeto que no tienes', async () => {
    const { prisma } = makePrisma();
    prisma.userItem.findFirst.mockResolvedValue(null);
    const service = new ItemUpgradesService(prisma as any);
    await expect(service.buy('u1', 'up-on')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sin monedas suficientes no se compra (y no se cobra)', async () => {
    const { prisma, tx } = makePrisma();
    tx.user.updateMany.mockResolvedValue({ count: 0 });
    const service = new ItemUpgradesService(prisma as any);
    await expect(service.buy('u1', 'up-on')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.coinTransaction.create).not.toHaveBeenCalled();
  });

  it('si el objeto es del marketplace, el creador cobra su parte', async () => {
    const { prisma, tx } = makePrisma();
    prisma.marketplaceContent.findFirst.mockResolvedValue({ id: 'c1', creatorId: 'cr1', title: 'TV retro' });
    const service = new ItemUpgradesService(prisma as any);
    await service.buy('u1', 'up-on');
    expect(tx.creatorWallet.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ availableBalance: 80, totalCommissions: 20 }) }),
    );
  });

  it('solo acepta estados que existen en el comportamiento del objeto', async () => {
    const { prisma } = makePrisma();
    const service = new ItemUpgradesService(prisma as any);
    await expect(
      service.create({ userId: 'a', role: 'ADMIN' }, 'tv', {
        key: 'canales', name: 'Canales', priceCoins: 50, unlockStates: ['NOPE'],
      }),
    ).rejects.toThrow(/Estados no válidos/);
    await expect(
      service.create({ userId: 'a', role: 'ADMIN' }, 'tv', {
        key: 'encendido', name: 'Encendido', priceCoins: 50, unlockStates: ['ON'],
      }),
    ).resolves.toMatchObject({ unlockStates: ['ON'] });
  });

  it('un jugador que no es admin ni el creador no puede crear mejoras', async () => {
    const { prisma } = makePrisma();
    const service = new ItemUpgradesService(prisma as any);
    await expect(
      service.create({ userId: 'x', role: 'STUDENT' }, 'tv', {
        key: 'encendido', name: 'Encendido', priceCoins: 50, unlockStates: ['ON'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
