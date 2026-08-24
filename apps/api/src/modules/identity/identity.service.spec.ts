import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IdentityService } from './identity.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { EmailService } from '../email/email.service';
import { PremiumAccessService } from '../premium-access/premium-access.service';
import { GameGateway } from '../game/game.gateway';

describe('IdentityService', () => {
  let service: IdentityService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userItem: {
      findMany: jest.fn(),
    },
  };
  const jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };
  const gamificationService = { getMissionsForUser: jest.fn() };
  const emailService = { sendWelcomeEmail: jest.fn() };
  const premiumAccessService = { hasPremiumAccess: jest.fn().mockResolvedValue(false) };
  const gameGateway = { broadcastNameEffectUpdate: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: GamificationService, useValue: gamificationService },
        { provide: EmailService, useValue: emailService },
        { provide: PremiumAccessService, useValue: premiumAccessService },
        { provide: GameGateway, useValue: gameGateway },
      ],
    }).compile();

    service = module.get<IdentityService>(IdentityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('login throws UnauthorizedException when no user matches the email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nobody@example.com', password: 'x' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  describe('updateProfile — realtime nameEffectId broadcast', () => {
    it('broadcasts the new nameEffectId to the game gateway after a successful update', async () => {
      // getUnlockedEffectIds: usuario no-admin, sin Premium, sin items —
      // solo el tier free debe estar desbloqueado ("uncommon" está ahí).
      prisma.user.findUnique.mockResolvedValue({ role: 'STUDENT' });
      prisma.userItem.findMany.mockResolvedValue([]);
      prisma.user.update.mockResolvedValue({
        birthDate: null,
        country: null,
        uiLanguage: null,
        pcTheme: null,
        chatBubbleThemeId: null,
        nameEffectId: 'uncommon',
      });

      await service.updateProfile('user-1', { nameEffectId: 'uncommon' } as any);

      expect(gameGateway.broadcastNameEffectUpdate).toHaveBeenCalledTimes(1);
      expect(gameGateway.broadcastNameEffectUpdate).toHaveBeenCalledWith('user-1', 'uncommon');
    });

    it('does not broadcast when the PATCH does not include nameEffectId', async () => {
      prisma.user.update.mockResolvedValue({
        birthDate: '2000-01-01',
        country: 'CO',
        uiLanguage: null,
        pcTheme: null,
        chatBubbleThemeId: null,
        nameEffectId: null,
      });

      await service.updateProfile('user-1', { country: 'CO' } as any);

      expect(gameGateway.broadcastNameEffectUpdate).not.toHaveBeenCalled();
    });

    it('rejects a locked effect with ForbiddenException and never broadcasts', async () => {
      // "galaxy" es tier "ownable" -- sin UserItem para ese Item, no está
      // desbloqueado, sin importar si el update en sí sería válido.
      prisma.user.findUnique.mockResolvedValue({ role: 'STUDENT' });
      prisma.userItem.findMany.mockResolvedValue([]);

      await expect(
        service.updateProfile('user-1', { nameEffectId: 'galaxy' } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(gameGateway.broadcastNameEffectUpdate).not.toHaveBeenCalled();
    });
  });
});
