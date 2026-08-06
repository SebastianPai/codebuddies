import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { OptionalJwtAuthGuard } from '../identity/guards/optional-jwt.guard';
import type {
  AuthenticatedRequest,
  OptionallyAuthenticatedRequest,
} from '../../common/types/authenticated-request.type';
import { CourseProjectsService } from './course-projects.service';
import { SubmitProjectDto } from './dto/course-project.dto';

@Controller('courses/:courseId/project')
export class CourseProjectsController {
  constructor(private readonly courseProjectsService: CourseProjectsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  get(@Req() req: OptionallyAuthenticatedRequest, @Param('courseId') courseId: string) {
    return this.courseProjectsService.getForCourse(courseId, req.user?.userId);
  }

  @Put('submit')
  @UseGuards(JwtAuthGuard)
  submit(
    @Req() req: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() dto: SubmitProjectDto,
  ) {
    return this.courseProjectsService.submit(courseId, req.user.userId, dto);
  }
}
