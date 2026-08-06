import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { CourseCategoriesService } from './course-categories.service';
import { UpsertCourseCategoryDto } from './dto/upsert-course-category.dto';

@Controller('admin/course-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CourseCategoriesAdminController {
  constructor(private readonly courseCategoriesService: CourseCategoriesService) {}

  @Post()
  create(@Body() dto: UpsertCourseCategoryDto) {
    return this.courseCategoriesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertCourseCategoryDto) {
    return this.courseCategoriesService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.courseCategoriesService.delete(id);
  }
}
