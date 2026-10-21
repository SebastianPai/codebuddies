import { Test, TestingModule } from '@nestjs/testing';
import { PremiumAccessService } from '../../premium-access/premium-access.service';
import { AvatarService } from './avatar.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AvatarService', () => {
  let service: AvatarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvatarService,
        { provide: PrismaService, useValue: {} },
        { provide: PremiumAccessService, useValue: { hasPremiumAccess: async () => false } },
      ],
    }).compile();

    service = module.get<AvatarService>(AvatarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
