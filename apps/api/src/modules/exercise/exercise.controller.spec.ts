import { Test, TestingModule } from '@nestjs/testing';
import { ExerciseController } from './exercise.controller';
import { ExerciseService } from './exercise.service';

describe('ExerciseController', () => {
  let controller: ExerciseController;
  const exerciseService = {
    getExercisesByLesson: jest.fn(),
    submitQuizAnswer: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExerciseController],
      providers: [{ provide: ExerciseService, useValue: exerciseService }],
    }).compile();

    controller = module.get<ExerciseController>(ExerciseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getByLesson passes the authenticated userId/role (or undefined for anonymous) to the service', async () => {
    exerciseService.getExercisesByLesson.mockResolvedValue([]);

    await controller.getByLesson(
      { user: { userId: 'user-1', role: 'STUDENT' } } as any,
      'lesson-1',
      'es',
    );
    expect(exerciseService.getExercisesByLesson).toHaveBeenCalledWith(
      'lesson-1',
      'user-1',
      'es',
      'STUDENT',
    );

    await controller.getByLesson({ user: undefined }, 'lesson-1', 'es');
    expect(exerciseService.getExercisesByLesson).toHaveBeenLastCalledWith(
      'lesson-1',
      undefined,
      'es',
      undefined,
    );
  });

  it('submitQuizAnswer requires an authenticated user and delegates to the service', async () => {
    exerciseService.submitQuizAnswer.mockResolvedValue({ correct: true });
    const dto = { questionIndex: 0, selectedOptions: [1] };

    const result = await controller.submitQuizAnswer(
      { user: { userId: 'user-1', role: 'STUDENT' } } as any,
      'exercise-1',
      dto as any,
    );

    expect(exerciseService.submitQuizAnswer).toHaveBeenCalledWith(
      'user-1',
      'exercise-1',
      dto,
      'STUDENT',
    );
    expect(result).toEqual({ correct: true });
  });
});
