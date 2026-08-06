import { Controller, Get } from '@nestjs/common';
import { CourseCategoriesService } from './course-categories.service';

@Controller('course-categories')
export class CourseCategoriesController {
  constructor(private readonly courseCategoriesService: CourseCategoriesService) {}

  @Get()
  list() {
    return this.courseCategoriesService.list();
  }
}
