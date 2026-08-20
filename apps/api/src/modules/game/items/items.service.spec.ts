import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ItemsService } from './items.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PremiumAccessService } from '../../premium-access/premium-access.service';

describe('ItemsService', () => {
  let service: ItemsService;

  const tx = {
    user: { updateMany: jest.fn() },
    coinTransaction: { create: jest.fn() },
    userItem: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
  };

  const prisma = {
    item: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };

  const premiumAccessService = {
    hasPremiumAccess: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PremiumAccessService, useValue: premiumAccessService },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
  });

  describe('getRarityCatalog', () => {
    it('exposes the 5-tier rarity source of truth', () => {
      const catalog = service.getRarityCatalog();
      expect(catalog.map((r) => r.key)).toEqual(['common', 'uncommon', 'rare', 'epic', 'legendary']);
    });
  });

  describe('buyItem', () => {
    const freeItem = {
      id: 'item-1',
      shopVisible: true,
      coinsPrice: 100,
      accessType: 'FREE',
      maxStack: 1,
    };

    it('throws NotFoundException when the item does not exist', async () => {
      prisma.item.findUnique.mockResolvedValue(null);
      await expect(service.buyItem('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the item is not shopVisible', async () => {
      prisma.item.findUnique.mockResolvedValue({ ...freeItem, shopVisible: false });
      await expect(service.buyItem('user-1', 'item-1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when coinsPrice is 0/null (not for sale)', async () => {
      prisma.item.findUnique.mockResolvedValue({ ...freeItem, coinsPrice: null });
      await expect(service.buyItem('user-1', 'item-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the buyer does not exist', async () => {
      prisma.item.findUnique.mockResolvedValue(freeItem);
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.buyItem('user-1', 'item-1')).rejects.toThrow(NotFoundException);
    });

    describe('accessType enforcement', () => {
      it('allows FREE items through the normal coin flow', async () => {
        prisma.item.findUnique.mockResolvedValue(freeItem);
        prisma.user.findUnique.mockResolvedValue({ id: 'user-1', coins: 500 });
        tx.user.updateMany.mockResolvedValue({ count: 1 });
        tx.userItem.findUnique.mockResolvedValue(null);

        await service.buyItem('user-1', 'item-1');

        expect(tx.userItem.create).toHaveBeenCalledWith({
          data: { userId: 'user-1', itemId: 'item-1', amount: 1, source: 'shop' },
        });
      });

      it('requires an active subscription for PREMIUM items', async () => {
        prisma.item.findUnique.mockResolvedValue({ ...freeItem, accessType: 'PREMIUM' });
        prisma.user.findUnique.mockResolvedValue({ id: 'user-1', coins: 500 });
        premiumAccessService.hasPremiumAccess.mockResolvedValueOnce(false);

        await expect(service.buyItem('user-1', 'item-1')).rejects.toThrow(ForbiddenException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('allows PREMIUM items when the user has an active subscription', async () => {
        prisma.item.findUnique.mockResolvedValue({ ...freeItem, accessType: 'PREMIUM' });
        prisma.user.findUnique.mockResolvedValue({ id: 'user-1', coins: 500 });
        premiumAccessService.hasPremiumAccess.mockResolvedValueOnce(true);
        tx.user.updateMany.mockResolvedValue({ count: 1 });
        tx.userItem.findUnique.mockResolvedValue(null);

        await service.buyItem('user-1', 'item-1');

        expect(tx.userItem.create).toHaveBeenCalled();
      });

      // No existe ningún VipAccessService en la app -- tratar VIP como
      // Premium sería inventar un acceso que nadie otorgó. Debe rechazarse
      // de forma explícita, no caer silenciosamente al flujo FREE.
      it('rejects VIP items outright (no VIP access system exists yet)', async () => {
        prisma.item.findUnique.mockResolvedValue({ ...freeItem, accessType: 'VIP' });
        prisma.user.findUnique.mockResolvedValue({ id: 'user-1', coins: 500 });

        await expect(service.buyItem('user-1', 'item-1')).rejects.toThrow(BadRequestException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('rejects EVENT items even if coinsPrice is set', async () => {
        prisma.item.findUnique.mockResolvedValue({ ...freeItem, accessType: 'EVENT' });
        prisma.user.findUnique.mockResolvedValue({ id: 'user-1', coins: 500 });

        await expect(service.buyItem('user-1', 'item-1')).rejects.toThrow(BadRequestException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });
    });

    describe('coins', () => {
      it('rejects the purchase when the user cannot afford it (CAS returns 0)', async () => {
        prisma.item.findUnique.mockResolvedValue(freeItem);
        prisma.user.findUnique.mockResolvedValue({ id: 'user-1', coins: 5 });
        tx.user.updateMany.mockResolvedValue({ count: 0 });

        await expect(service.buyItem('user-1', 'item-1')).rejects.toThrow(BadRequestException);
        expect(tx.coinTransaction.create).not.toHaveBeenCalled();
      });
    });

    describe('maxStack enforcement', () => {
      it('increments amount when the user is under maxStack', async () => {
        prisma.item.findUnique.mockResolvedValue({ ...freeItem, maxStack: 3 });
        prisma.user.findUnique.mockResolvedValue({ id: 'user-1', coins: 500 });
        tx.user.updateMany.mockResolvedValue({ count: 1 });
        tx.userItem.findUnique.mockResolvedValue({ userId: 'user-1', itemId: 'item-1', amount: 1 });
        tx.userItem.updateMany.mockResolvedValue({ count: 1 });

        await service.buyItem('user-1', 'item-1');

        expect(tx.userItem.updateMany).toHaveBeenCalledWith({
          where: { userId: 'user-1', itemId: 'item-1', amount: { lt: 3 } },
          data: { amount: { increment: 1 } },
        });
      });

      // Guarda real contra la carrera: si dos compras concurrentes ya
      // dejaron amount en el tope, el WHERE amount < maxStack no matchea
      // ninguna fila (count 0) y se rechaza -- no se lee el amount viejo y
      // se incrementa por encima del límite.
      it('rejects the purchase when the user is already at maxStack (concurrency-safe CAS)', async () => {
        prisma.item.findUnique.mockResolvedValue({ ...freeItem, maxStack: 1 });
        prisma.user.findUnique.mockResolvedValue({ id: 'user-1', coins: 500 });
        tx.user.updateMany.mockResolvedValue({ count: 1 });
        tx.userItem.findUnique.mockResolvedValue({ userId: 'user-1', itemId: 'item-1', amount: 1 });
        tx.userItem.updateMany.mockResolvedValue({ count: 0 });

        await expect(service.buyItem('user-1', 'item-1')).rejects.toThrow(BadRequestException);
        expect(tx.userItem.create).not.toHaveBeenCalled();
      });

      it('creates a new UserItem row on the very first purchase', async () => {
        prisma.item.findUnique.mockResolvedValue({ ...freeItem, maxStack: 1 });
        prisma.user.findUnique.mockResolvedValue({ id: 'user-1', coins: 500 });
        tx.user.updateMany.mockResolvedValue({ count: 1 });
        tx.userItem.findUnique.mockResolvedValue(null);

        await service.buyItem('user-1', 'item-1');

        expect(tx.userItem.create).toHaveBeenCalledWith({
          data: { userId: 'user-1', itemId: 'item-1', amount: 1, source: 'shop' },
        });
        expect(tx.userItem.updateMany).not.toHaveBeenCalled();
      });
    });
  });

  describe('price validation on create/update', () => {
    it('createItem rejects a price incompatible with the chosen rarity before writing anything', async () => {
      const createSpy = jest.fn();
      (prisma as unknown as { item: { create: jest.Mock } }).item.create = createSpy;

      await expect(
        service.createItem({
          name: 'Test',
          rarity: 3, // Epic: 1800-3500
          coinsPrice: 100, // el mismo caso real de la auditoría
        } as never),
      ).rejects.toThrow(BadRequestException);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('updateItem rejects when the merged rarity+price combination is out of range', async () => {
      prisma.item.findUnique.mockResolvedValue({ rarity: 3, coinsPrice: 2000 });
      const updateSpy = jest.fn();
      (prisma as unknown as { item: { update: jest.Mock } }).item.update = updateSpy;

      // Solo cambia coinsPrice -- rarity se mantiene en el Epic (3) ya
      // guardado, así que 100 sigue siendo inválido para ese rango.
      await expect(service.updateItem('item-1', { coinsPrice: 100 } as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('getShopItems', () => {
    it('only queries items flagged as shopVisible (QA items stay hidden without being deleted)', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      (prisma as unknown as { item: { findMany: jest.Mock } }).item.findMany = findMany;

      await service.getShopItems({});

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ shopVisible: true }) }),
      );
    });
  });
});
