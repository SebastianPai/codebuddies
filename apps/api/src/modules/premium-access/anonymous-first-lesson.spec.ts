import { PremiumAccessService } from './premium-access.service';

// Sin cuenta solo se prueba la primera lección de un curso (y sus ejercicios).
// Las recompensas siguen exigiendo cuenta: los envíos tienen JwtAuthGuard.
describe('PremiumAccessService — visitante sin cuenta', () => {
  const prisma = {
    completion: { findMany: jest.fn(), count: jest.fn() },
    lesson: { count: jest.fn(), findFirst: jest.fn() },
  };
  const service = new PremiumAccessService(prisma as any);
  const lessons = [
    { id: 'l1', exercises: [{ id: 'e1', type: 'QUIZ' }, { id: 'e2', type: 'CODE' }] },
    { id: 'l2', exercises: [{ id: 'e3', type: 'CODE' }] },
    { id: 'l3', exercises: [] },
  ];

  beforeEach(() => jest.clearAllMocks());

  it('en la lista del curso: primera lección abierta, el resto cerrado', async () => {
    const state = await service.getCourseProgressionState({ lessons });
    expect([...state.lockedLessons]).toEqual(['l2', 'l3']);
    expect([...state.lockedExercises]).toEqual(['e3']);
    expect(prisma.completion.findMany).not.toHaveBeenCalled();
  });

  it('una lección suelta: abierta solo si no hay otra publicada antes', async () => {
    prisma.lesson.count.mockResolvedValueOnce(0);
    expect(await service.isLessonProgressionLocked({ courseId: 'c', lessonId: 'l1', lessonOrder: 1 })).toBe(false);
    prisma.lesson.count.mockResolvedValueOnce(1);
    expect(await service.isLessonProgressionLocked({ courseId: 'c', lessonId: 'l2', lessonOrder: 2 })).toBe(true);
  });
});
