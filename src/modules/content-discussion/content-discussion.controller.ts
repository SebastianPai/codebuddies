import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { ContentDiscussionService } from './content-discussion.service';
import { CreateCommentDto, CreateReportDto } from './dto/content-discussion.dto';

@Controller()
export class ContentDiscussionController {
  constructor(private readonly contentDiscussionService: ContentDiscussionService) {}

  @Get('lessons/:lessonId/comments')
  listLessonComments(@Param('lessonId') lessonId: string) {
    return this.contentDiscussionService.listComments({ lessonId });
  }

  @Post('lessons/:lessonId/comments')
  @UseGuards(JwtAuthGuard)
  createLessonComment(
    @Req() req: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.contentDiscussionService.createComment(req.user.userId, { lessonId }, dto);
  }

  @Post('lessons/:lessonId/report')
  @UseGuards(JwtAuthGuard)
  reportLesson(
    @Req() req: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.contentDiscussionService.createReport(req.user.userId, { lessonId }, dto);
  }

  @Get('exercises/:exerciseId/comments')
  listExerciseComments(@Param('exerciseId') exerciseId: string) {
    return this.contentDiscussionService.listComments({ exerciseId });
  }

  @Post('exercises/:exerciseId/comments')
  @UseGuards(JwtAuthGuard)
  createExerciseComment(
    @Req() req: AuthenticatedRequest,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.contentDiscussionService.createComment(req.user.userId, { exerciseId }, dto);
  }

  @Post('exercises/:exerciseId/report')
  @UseGuards(JwtAuthGuard)
  reportExercise(
    @Req() req: AuthenticatedRequest,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.contentDiscussionService.createReport(req.user.userId, { exerciseId }, dto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  deleteComment(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.contentDiscussionService.deleteComment(
      req.user.userId,
      req.user.role === 'ADMIN',
      id,
    );
  }
}
