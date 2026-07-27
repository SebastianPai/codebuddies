import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Delete,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';

import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { Patch } from '@nestjs/common';

import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';

@Controller('courses')
export class CourseController {
  constructor(private courseService: CourseService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body() body: any) {
    // 🔥 Parse translations
    let translations = [];

    if (body.translations) {
      try {
        translations =
          typeof body.translations === 'string'
            ? JSON.parse(body.translations)
            : body.translations;
      } catch (error) {
        throw new BadRequestException('Formato inválido en translations');
      }
    }

    const dto: CreateCourseDto = {
      moduleId: body.moduleId,
      difficulty: body.difficulty,
      freeLimit: Number(body.freeLimit),
      translations,
    };

    return this.courseService.createCourse(dto, body.imageUrl);
  }

  @Get()
  async findAll(@Query('lang') lang = 'es') {
    return this.courseService.getAllCourses(lang);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('lang') lang = 'es') {
    return this.courseService.getCourseById(id, lang);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.courseService.deleteCourse(id);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAdminCourse(@Param('id') id: string) {
    return this.courseService.getCourseForAdmin(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() body: any) {
    let translations = [];

    if (body.translations) {
      try {
        translations =
          typeof body.translations === 'string'
            ? JSON.parse(body.translations)
            : body.translations;
      } catch (error) {
        throw new BadRequestException('Formato inválido en translations');
      }
    }

    const payload = {
      moduleId: body.moduleId,
      difficulty: body.difficulty,
      freeLimit: Number(body.freeLimit),
      imageUrl: body.imageUrl,
      translations,
    };

    return this.courseService.updateCourse(id, payload);
  }
}
