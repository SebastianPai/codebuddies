import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Delete,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';

import { CourseService } from './course.service';
import { CourseRecommendationsService } from './course-recommendations.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Patch } from '@nestjs/common';

import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { OptionalJwtAuthGuard } from '../identity/guards/optional-jwt.guard';
import type { AuthenticatedRequest, OptionallyAuthenticatedRequest } from '../../common/types/authenticated-request.type';

@Controller('courses')
export class CourseController {
  constructor(
    private courseService: CourseService,
    private readonly courseRecommendationsService: CourseRecommendationsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body() dto: CreateCourseDto) {
    return this.courseService.createCourse(dto, dto.imageUrl);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Req() req: OptionallyAuthenticatedRequest,
    @Query('lang') lang = 'es',
    @Query('q') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.courseService.getAllCourses(
      lang,
      {
        userId: req.user?.userId,
        role: req.user?.role,
      },
      { search, categoryId },
    );
  }

  // Antes de :id para que NestJS no matchee "recommendations" como id.
  @Get('recommendations')
  @UseGuards(OptionalJwtAuthGuard)
  async getRecommendations(
    @Req() req: OptionallyAuthenticatedRequest,
    @Query('lang') lang = 'es',
  ) {
    return this.courseRecommendationsService.getRecommendations(req.user?.userId, lang);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Req() req: OptionallyAuthenticatedRequest,
    @Param('id') id: string,
    @Query('lang') lang = 'es',
  ) {
    return this.courseService.getCourseById(id, lang, {
      userId: req.user?.userId,
      role: req.user?.role,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.courseService.deleteCourse(id, req.user.userId);
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
  async update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courseService.updateCourse(id, dto, req.user.userId);
  }
}
