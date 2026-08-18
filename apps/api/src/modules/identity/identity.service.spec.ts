import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IdentityService } from './identity.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { EmailService } from '../email/email.service';
import { PremiumAccessService } from '../premium-access/premium-access.service';

describe('IdentityService', () => {
  let service: IdentityService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };
  const jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };
  const gamificationService = { getMissionsForUser: jest.fn() };
  const emailService = { sendWelcomeEmail: jest.fn() };
  const premiumAccessService = { hasPremiumAccess: jest.fn().mockResolvedValue(false) };

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
});
