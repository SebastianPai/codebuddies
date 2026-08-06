import { Controller, Get, Param, Query } from '@nestjs/common';
import { LearningPathsService } from './learning-paths.service';

@Controller('learning-paths')
export class LearningPathsController {
  constructor(private readonly learningPathsService: LearningPathsService) {}

  @Get()
  list(@Query('lang') lang = 'es') {
    return this.learningPathsService.listPublic(lang);
  }

  @Get(':slugOrId')
  getOne(@Param('slugOrId') slugOrId: string, @Query('lang') lang = 'es') {
    return this.learningPathsService.getPublicBySlugOrId(slugOrId, lang);
  }
}
