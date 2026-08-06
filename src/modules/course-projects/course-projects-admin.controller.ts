import { Body, Controller, Delete, Get, Param, Patch, Put, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { CourseProjectsService } from './course-projects.service';
import { ReviewSubmissionDto, UpsertCourseProjectDto } from './dto/course-project.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CourseProjectsAdminController {
  constructor(private readonly courseProjectsService: CourseProjectsService) {}

  @Put('courses/:courseId/project')
  upsert(@Param('courseId') courseId: string, @Body() dto: UpsertCourseProjectDto) {
    return this.courseProjectsService.upsert(courseId, dto);
  }

  @Delete('courses/:courseId/project')
  delete(@Param('courseId') courseId: string) {
    return this.courseProjectsService.delete(courseId);
  }

  @Get('courses/:courseId/project/submissions')
  listSubmissions(@Param('courseId') courseId: string) {
    return this.courseProjectsService.listSubmissionsForAdmin(courseId);
  }

  @Patch('course-project-submissions/:submissionId/review')
  review(
    @Req() req: AuthenticatedRequest,
    @Param('submissionId') submissionId: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.courseProjectsService.review(submissionId, req.user.userId, dto);
  }
}
