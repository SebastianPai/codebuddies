import { Body, Controller, Delete, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { CourseReviewsService } from './course-reviews.service';
import { UpsertCourseReviewDto } from './dto/upsert-course-review.dto';

@Controller('courses/:courseId/reviews')
export class CourseReviewsController {
  constructor(private readonly courseReviewsService: CourseReviewsService) {}

  @Get()
  list(@Param('courseId') courseId: string, @Query() pagination: PaginationQueryDto) {
    return this.courseReviewsService.listForCourse(courseId, pagination);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMine(@Req() req: AuthenticatedRequest, @Param('courseId') courseId: string) {
    return this.courseReviewsService.getMine(req.user.userId, courseId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  upsert(
    @Req() req: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() dto: UpsertCourseReviewDto,
  ) {
    return this.courseReviewsService.upsert(req.user.userId, courseId, dto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  remove(@Req() req: AuthenticatedRequest, @Param('courseId') courseId: string) {
    return this.courseReviewsService.remove(req.user.userId, courseId);
  }
}
