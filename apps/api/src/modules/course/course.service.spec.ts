import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CourseService } from './course.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PremiumAccessService } from '../premium-access/premium-access.service';
import { AdminAuditService } from '../admin/services/admin-audit.service';
import { CacheService } from '../../cache/cache.service';

describe('CourseService', () => {
  let service: CourseService;
  const prisma = {
    course: {
      findUnique: jest.fn(),
    },
  };
  const premiumAccessService = {
    hasPremiumAccess: jest.fn().mockResolvedValue(false),
    hasFullAccess: jest.fn().mockReturnValue(false),
  };
  const adminAuditService = {
    log: jest.fn(),
    logStandalone: jest.fn(),
  };
  const cacheService = {
    getOrSet: jest.fn((_key: string, _ttl: number, load: () => unknown) => load()),
    invalidate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: PrismaService, useValue: prisma },
        { provide: PremiumAccessService, useValue: premiumAccessService },
        { provide: AdminAuditService, useValue: adminAuditService },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getCourseById throws NotFoundException when the course does not exist', async () => {
    prisma.course.findUnique.mockResolvedValue(null);

    await expect(service.getCourseById('missing-id', 'es')).rejects.toThrow(
      NotFoundException,
    );
  });
});
