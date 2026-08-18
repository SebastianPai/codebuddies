import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExerciseService } from './exercise.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { PremiumAccessService } from '../premium-access/premium-access.service';

describe('ExerciseService', () => {
  let service: ExerciseService;
  const prisma = {
    exercise: {
      findUnique: jest.fn(),
    },
    exerciseAttempt: {
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
  };
  const progressService = {
    createProgress: jest.fn(),
  };
  const premiumAccessService = {
    hasPremiumAccess: jest.fn().mockResolvedValue(false),
    hasFullAccess: jest.fn().mockReturnValue(false),
    getLessonIndex: jest.fn().mockResolvedValue(0),
    isLessonLocked: jest.fn().mockResolvedValue(false),
  };

  const quizExercise = {
    id: 'exercise-1',
    type: 'QUIZ',
    lessonId: 'lesson-1',
    content: null,
    lesson: {
      order: 1,
      courseId: 'course-1',
      course: { freeLimit: 5 },
    },
    translations: [
      {
        language: { code: 'es' },
        content: {
          questions: [
            {
              question: '¿Cuánto es 2 + 2?',
              options: ['3', '4', '5'],
              correct: [1],
              isMultiple: false,
              explanation: '2 + 2 = 4',
            },
          ],
        },
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExerciseService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProgressService, useValue: progressService },
        { provide: PremiumAccessService, useValue: premiumAccessService },
      ],
    }).compile();

    service = module.get<ExerciseService>(ExerciseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Este es el fix de seguridad C3 del audit: las respuestas correctas nunca
  // deben viajar al cliente sin pasar por acá, así que la corrección tiene
  // que resolverse server-side.
  it('submitQuizAnswer marks a correct answer as correct and registers progress', async () => {
    prisma.exercise.findUnique.mockResolvedValue(quizExercise as any);
    progressService.createProgress.mockResolvedValue({
      xpAdded: 20,
      coinsAdded: 10,
    });

    const result = await service.submitQuizAnswer('user-1', 'exercise-1', {
      questionIndex: 0,
      selectedOptions: [1],
    } as any);

    expect(result.correct).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.xpAdded).toBe(20);
    expect(result.coinsAdded).toBe(10);
    expect(progressService.createProgress).toHaveBeenCalledWith(
      'user-1',
      {
        lessonId: 'lesson-1',
        exerciseId: 'exercise-1',
        attempts: 1,
        score: 100,
        timeSpentSeconds: undefined,
      },
      undefined,
    );
  });

  it('submitQuizAnswer marks a wrong answer as incorrect without registering progress', async () => {
    prisma.exercise.findUnique.mockResolvedValue(quizExercise as any);

    const result = await service.submitQuizAnswer('user-1', 'exercise-1', {
      questionIndex: 0,
      selectedOptions: [0],
    } as any);

    expect(result.correct).toBe(false);
    expect(result.completed).toBe(false);
    expect(result.xpAdded).toBe(0);
    expect(progressService.createProgress).not.toHaveBeenCalled();
  });

  it('submitQuizAnswer throws NotFoundException for a missing exercise', async () => {
    prisma.exercise.findUnique.mockResolvedValue(null);

    await expect(
      service.submitQuizAnswer('user-1', 'missing', {
        questionIndex: 0,
        selectedOptions: [0],
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  // PREM3: acceder al contenido pago sin ser premium debe fallar server-side,
  // no solo esconderse en el frontend.
  it('submitQuizAnswer throws ForbiddenException when the lesson is locked for this user', async () => {
    prisma.exercise.findUnique.mockResolvedValue(quizExercise as any);
    premiumAccessService.isLessonLocked.mockResolvedValueOnce(true);

    await expect(
      service.submitQuizAnswer('user-1', 'exercise-1', {
        questionIndex: 0,
        selectedOptions: [1],
      } as any),
    ).rejects.toThrow(ForbiddenException);
    expect(progressService.createProgress).not.toHaveBeenCalled();
  });
});
