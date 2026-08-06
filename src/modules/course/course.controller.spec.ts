import { Test, TestingModule } from '@nestjs/testing';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { CourseRecommendationsService } from './course-recommendations.service';

describe('CourseController', () => {
  let controller: CourseController;
  const courseService = {
    getAllCourses: jest.fn(),
    getCourseById: jest.fn(),
  };
  const courseRecommendationsService = {
    getRecommendations: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        { provide: CourseService, useValue: courseService },
        { provide: CourseRecommendationsService, useValue: courseRecommendationsService },
      ],
    }).compile();

    controller = module.get<CourseController>(CourseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to CourseService.getAllCourses with the requested language and requester identity', async () => {
    courseService.getAllCourses.mockResolvedValue([{ id: 'course-1' }]);

    const result = await controller.findAll(
      { user: { userId: 'user-1', role: 'STUDENT' } } as any,
      'en',
    );

    expect(courseService.getAllCourses).toHaveBeenCalledWith(
      'en',
      { userId: 'user-1', role: 'STUDENT' },
      { search: undefined, categoryId: undefined },
    );
    expect(result).toEqual([{ id: 'course-1' }]);
  });

  it('findOne delegates to CourseService.getCourseById with id, language and the requester identity', async () => {
    courseService.getCourseById.mockResolvedValue({ id: 'course-1' });

    const result = await controller.findOne(
      { user: { userId: 'user-1', role: 'STUDENT' } } as any,
      'course-1',
      'es',
    );

    expect(courseService.getCourseById).toHaveBeenCalledWith('course-1', 'es', {
      userId: 'user-1',
      role: 'STUDENT',
    });
    expect(result).toEqual({ id: 'course-1' });
  });

  it('findOne works for anonymous requests', async () => {
    courseService.getCourseById.mockResolvedValue({ id: 'course-1' });

    await controller.findOne({ user: undefined }, 'course-1', 'es');

    expect(courseService.getCourseById).toHaveBeenCalledWith('course-1', 'es', {
      userId: undefined,
      role: undefined,
    });
  });
});
