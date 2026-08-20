import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BattlePassService } from './battle-pass.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { GamificationService } from '../../gamification/gamification.service';
import { PremiumAccessService } from '../../premium-access/premium-access.service';

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6.0.0',
  });
}

describe('BattlePassService', () => {
  let service: BattlePassService;

  const tx = {
    battlePassClaim: { create: jest.fn() },
  };

  const prisma = {
    battlePassTier: { findUnique: jest.fn() },
    userBattlePassProgress: { findUnique: jest.fn() },
    battlePassSeason: { findFirst: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };

  const gamificationService = {
    grantRewards: jest.fn().mockResolvedValue([{ id: 'ledger-1' }]),
  };

  const premiumAccessService = {
    hasPremiumAccess: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    premiumAccessService.hasPremiumAccess.mockResolvedValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BattlePassService,
        { provide: PrismaService, useValue: prisma },
        { provide: GamificationService, useValue: gamificationService },
        { provide: PremiumAccessService, useValue: premiumAccessService },
      ],
    }).compile();

    service = module.get<BattlePassService>(BattlePassService);
  });

  describe('claimTier', () => {
    const freeTier = {
      id: 'tier-1',
      level: 5,
      track: 'FREE',
      rewardType: 'COINS',
      amount: 50,
      itemId: null,
      label: '50 coins',
      seasonId: 'season-1',
      season: { id: 'season-1', status: 'ACTIVE' },
    };

    it('throws NotFoundException when the tier does not exist', async () => {
      prisma.battlePassTier.findUnique.mockResolvedValue(null);

      await expect(service.claimTier('user-1', 'missing-tier')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the user has not reached the level yet', async () => {
      prisma.battlePassTier.findUnique.mockResolvedValue(freeTier);
      prisma.userBattlePassProgress.findUnique.mockResolvedValue({ level: 1, xp: 0 });

      await expect(service.claimTier('user-1', 'tier-1')).rejects.toThrow(ForbiddenException);
      expect(tx.battlePassClaim.create).not.toHaveBeenCalled();
    });

    // Única fuente de acceso al track PREMIUM: PremiumAccessService
    // (CodeBuddies Pro). No existe ninguna forma de comprarlo con coins.
    it('throws ForbiddenException on a PREMIUM tier without an active subscription', async () => {
      prisma.battlePassTier.findUnique.mockResolvedValue({ ...freeTier, track: 'PREMIUM' });
      prisma.userBattlePassProgress.findUnique.mockResolvedValue({ level: 10, xp: 5000 });
      premiumAccessService.hasPremiumAccess.mockResolvedValueOnce(false);

      await expect(service.claimTier('user-1', 'tier-1')).rejects.toThrow(ForbiddenException);
      expect(tx.battlePassClaim.create).not.toHaveBeenCalled();
    });

    it('allows a PREMIUM claim when the user has an active subscription', async () => {
      prisma.battlePassTier.findUnique.mockResolvedValue({ ...freeTier, track: 'PREMIUM' });
      prisma.userBattlePassProgress.findUnique.mockResolvedValue({ level: 10, xp: 5000 });
      premiumAccessService.hasPremiumAccess.mockResolvedValueOnce(true);
      tx.battlePassClaim.create.mockResolvedValue({ id: 'claim-1' });

      const result = await service.claimTier('user-1', 'tier-1');

      expect(gamificationService.grantRewards).toHaveBeenCalled();
      expect(result.granted).toEqual([{ id: 'ledger-1' }]);
    });

    it('grants the reward via GamificationService.grantRewards on a valid claim', async () => {
      prisma.battlePassTier.findUnique.mockResolvedValue(freeTier);
      prisma.userBattlePassProgress.findUnique.mockResolvedValue({ level: 5, xp: 4000 });
      tx.battlePassClaim.create.mockResolvedValue({ id: 'claim-1' });

      const result = await service.claimTier('user-1', 'tier-1');

      expect(tx.battlePassClaim.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', tierId: 'tier-1', seasonId: 'season-1' },
      });
      expect(gamificationService.grantRewards).toHaveBeenCalledWith(
        tx,
        'user-1',
        'BATTLE_PASS',
        'tier-1',
        '50 coins',
        [{ type: 'COINS', amount: 50, itemId: undefined, label: '50 coins' }],
      );
      expect(result.granted).toEqual([{ id: 'ledger-1' }]);
    });

    // Guarda de idempotencia real: un segundo claim del mismo tier nunca
    // debe otorgar la recompensa dos veces, aunque pase la validación de
    // nivel/track -- la unique constraint [userId, tierId] en la base es la
    // que realmente lo impide, acá se simula ese rechazo (P2002).
    it('rejects a duplicate claim without granting rewards again', async () => {
      prisma.battlePassTier.findUnique.mockResolvedValue(freeTier);
      prisma.userBattlePassProgress.findUnique.mockResolvedValue({ level: 5, xp: 4000 });
      tx.battlePassClaim.create.mockRejectedValue(uniqueConstraintError());

      await expect(service.claimTier('user-1', 'tier-1')).rejects.toThrow(BadRequestException);
      expect(gamificationService.grantRewards).not.toHaveBeenCalled();
    });
  });
});
