import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../identity/guards/optional-jwt.guard';
import type { OptionallyAuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { LearningPathsService } from './learning-paths.service';

@Controller('learning-paths')
export class LearningPathsController {
  constructor(private readonly learningPathsService: LearningPathsService) {}

  @Get()
  list(@Query('lang') lang = 'es') {
    return this.learningPathsService.listPublic(lang);
  }

  @Get(':slugOrId')
  @UseGuards(OptionalJwtAuthGuard)
  getOne(
    @Param('slugOrId') slugOrId: string,
    @Query('lang') lang = 'es',
    @Req() req?: OptionallyAuthenticatedRequest,
  ) {
    return this.learningPathsService.getPublicBySlugOrId(
      slugOrId,
      lang,
      req?.user?.userId,
    );
  }
}
