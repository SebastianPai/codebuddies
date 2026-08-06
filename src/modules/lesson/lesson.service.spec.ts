import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { PremiumAccessService } from '../premium-access/premium-access.service';

describe('LessonService', () => {
  let service: LessonService;
  const prisma = {
    course: {
      findUnique: jest.fn(),
    },
    lesson: {
      create: jest.fn(),
    },
  };
  const premiumAccessService = {
    isPremium: jest.fn().mockResolvedValue(false),
    hasFullAccess: jest.fn().mockReturnValue(false),
    isLessonLocked: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonService,
        { provide: PrismaService, useValue: prisma },
        { provide: PremiumAccessService, useValue: premiumAccessService },
      ],
    }).compile();

    service = module.get<LessonService>(LessonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createLesson throws NotFoundException when the parent course does not exist', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const dto: CreateLessonDto = {
      courseId: 'missing-course',
      order: 1,
      translations: [{ languageCode: 'es', title: 'Título' }],
    };

    await expect(service.createLesson(dto)).rejects.toThrow(NotFoundException);
    expect(prisma.lesson.create).not.toHaveBeenCalled();
  });
});
