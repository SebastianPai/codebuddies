import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Delete,
  Patch,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ReorderDto } from '../../common/dto/reorder.dto';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { OptionalJwtAuthGuard } from '../identity/guards/optional-jwt.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import type { OptionallyAuthenticatedRequest } from '../../common/types/authenticated-request.type';

@Controller('lessons')
export class LessonController {
  constructor(private lessonService: LessonService) {}

  // CREATE
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body() dto: CreateLessonDto) {
    return this.lessonService.createLesson(dto);
  }

  // ADMIN LIST
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAdminLessons() {
    return this.lessonService.getAdminLessons();
  }

  // ADMIN GET ONE
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAdminLesson(@Param('id') id: string) {
    return this.lessonService.getAdminLessonById(id);
  }

  // USER LIST
  @Get()
  async findAll(@Query('lang') lang = 'es') {
    return this.lessonService.getAllLessons(lang);
  }

  // LESSONS BY COURSE
  @Get('course/:courseId')
  @UseGuards(OptionalJwtAuthGuard)
  async getByCourse(
    @Req() req: OptionallyAuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Query('lang') lang = 'es',
  ) {
    return this.lessonService.getLessonsByCourse(courseId, lang, {
      userId: req.user?.userId,
      role: req.user?.role,
    });
  }

  // USER VIEW
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getById(
    @Req() req: OptionallyAuthenticatedRequest,
    @Param('id') id: string,
    @Query('lang') lang = 'es',
  ) {
    return this.lessonService.getLessonById(id, lang, {
      userId: req.user?.userId,
      role: req.user?.role,
    });
  }

  // REORDER (debe ir antes de :id para no matchear "reorder" como id)
  @Patch('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async reorder(@Body() dto: ReorderDto) {
    return this.lessonService.reorderLessons(dto);
  }

  // UPDATE
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.lessonService.updateLesson(id, dto);
  }

  // DELETE
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    return this.lessonService.deleteLesson(id);
  }
}
