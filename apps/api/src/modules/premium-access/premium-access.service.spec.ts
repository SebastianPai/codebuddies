import { Role } from '@prisma/client';
import { PremiumAccessService } from './premium-access.service';

describe('PremiumAccessService — progresión secuencial', () => {
  const prisma = {
    completion: { findMany: jest.fn() },
    exercise: { findMany: jest.fn() },
  };
  const service = new PremiumAccessService(prisma as any);

  const lessons = [
    {
      id: 'l1',
      exercises: [
        { id: 'e1', type: 'QUIZ' },
        { id: 'e2', type: 'CODE' },
      ],
    },
    { id: 'l2', exercises: [{ id: 'e3', type: 'QUIZ' }] },
  ];

  beforeEach(() => jest.clearAllMocks());

  it('sin progreso: teoría 1 abierta, sus ejercicios y la lección 2 bloqueados', async () => {
    prisma.completion.findMany.mockResolvedValue([]);
    const state = await service.getCourseProgressionState({
      userId: 'u1',
      lessons,
    });
    expect([...state.lockedLessons]).toEqual(['l2']);
    expect([...state.lockedExercises].sort()).toEqual(['e1', 'e2', 'e3']);
  });

  it('teoría leída: abre solo el primer ejercicio', async () => {
    prisma.completion.findMany.mockResolvedValue([
      { lessonId: 'l1', exerciseId: null },
    ]);
    const state = await service.getCourseProgressionState({
      userId: 'u1',
      lessons,
    });
    expect(state.lockedExercises.has('e1')).toBe(false);
    expect(state.lockedExercises.has('e2')).toBe(true);
    expect(state.lockedLessons.has('l2')).toBe(true);
  });

  it('lección 1 completa: abre la teoría 2 pero no su ejercicio', async () => {
    prisma.completion.findMany.mockResolvedValue([
      { lessonId: 'l1', exerciseId: null },
      { lessonId: 'l1', exerciseId: 'e1' },
      { lessonId: 'l1', exerciseId: 'e2' },
    ]);
    const state = await service.getCourseProgressionState({
      userId: 'u1',
      lessons,
    });
    expect(state.lockedLessons.size).toBe(0);
    expect([...state.lockedExercises]).toEqual(['e3']);
  });

  it('busca completions por ids de lección/ejercicio, no por courseId', async () => {
    prisma.completion.findMany.mockResolvedValue([]);
    await service.getCourseProgressionState({ userId: 'u1', lessons });
    const where = prisma.completion.findMany.mock.calls[0][0].where;
    expect(where.courseId).toBeUndefined();
    expect(where.OR).toEqual([
      { lessonId: { in: ['l1', 'l2'] } },
      { exerciseId: { in: ['e1', 'e2', 'e3'] } },
    ]);
  });

  it('los ejercicios LIVE no bloquean la progresión', async () => {
    prisma.completion.findMany.mockResolvedValue([
      { lessonId: 'a', exerciseId: null },
    ]);
    const state = await service.getCourseProgressionState({
      userId: 'u1',
      lessons: [
        {
          id: 'a',
          exercises: [
            { id: 'live', type: 'LIVE' },
            { id: 'q', type: 'QUIZ' },
          ],
        },
      ],
    });
    expect(state.lockedExercises.has('q')).toBe(false);
  });

  it('admin con bypass no tiene candados', async () => {
    prisma.completion.findMany.mockResolvedValue([]);
    const state = await service.getCourseProgressionState({
      userId: 'u1',
      role: Role.ADMIN,
      bypass: true,
      lessons,
    });
    expect(state.lockedLessons.size).toBe(0);
    expect(state.lockedExercises.size).toBe(0);
  });

  it('getExerciseStepLock señala el ejercicio anterior pendiente', async () => {
    prisma.exercise.findMany.mockResolvedValue([
      { id: 'e1', type: 'QUIZ' },
      { id: 'e2', type: 'CODE' },
    ]);
    prisma.completion.findMany.mockResolvedValue([{ exerciseId: null }]);
    await expect(
      service.getExerciseStepLock({
        lessonId: 'l1',
        exerciseId: 'e2',
        userId: 'u1',
      }),
    ).resolves.toEqual({
      kind: 'exercise',
      lessonId: 'l1',
      exerciseId: 'e1',
      exerciseType: 'QUIZ',
    });
  });

  it('getExerciseStepLock pide la teoría si no se leyó', async () => {
    prisma.exercise.findMany.mockResolvedValue([{ id: 'e1', type: 'QUIZ' }]);
    prisma.completion.findMany.mockResolvedValue([]);
    await expect(
      service.getExerciseStepLock({
        lessonId: 'l1',
        exerciseId: 'e1',
        userId: 'u1',
      }),
    ).resolves.toEqual({ kind: 'theory', lessonId: 'l1' });
  });
});
