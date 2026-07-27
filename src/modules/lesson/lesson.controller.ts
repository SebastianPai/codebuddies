import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Delete,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';

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
  async getByCourse(
    @Param('courseId') courseId: string,
    @Query('lang') lang = 'es',
  ) {
    return this.lessonService.getLessonsByCourse(courseId, lang);
  }

  // USER VIEW
  @Get(':id')
  async getById(@Param('id') id: string, @Query('lang') lang = 'es') {
    return this.lessonService.getLessonById(id, lang);
  }

  // UPDATE
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: any) {
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
