import { Test, TestingModule } from '@nestjs/testing';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';

describe('LessonController', () => {
  let controller: LessonController;
  const lessonService = {
    getLessonsByCourse: jest.fn(),
    getLessonById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonController],
      providers: [{ provide: LessonService, useValue: lessonService }],
    }).compile();

    controller = module.get<LessonController>(LessonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getByCourse delegates to LessonService.getLessonsByCourse with courseId, language and the requester identity', async () => {
    lessonService.getLessonsByCourse.mockResolvedValue([{ id: 'lesson-1' }]);

    const result = await controller.getByCourse(
      { user: { userId: 'user-1', role: 'STUDENT' } } as any,
      'course-1',
      'en',
    );

    expect(lessonService.getLessonsByCourse).toHaveBeenCalledWith(
      'course-1',
      'en',
      { userId: 'user-1', role: 'STUDENT' },
    );
    expect(result).toEqual([{ id: 'lesson-1' }]);
  });
});
