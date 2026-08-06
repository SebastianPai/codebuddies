import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { LearningPathsService } from './learning-paths.service';
import {
  SetPathCoursesDto,
  UpsertLearningPathDto,
} from './dto/upsert-learning-path.dto';

@Controller('admin/learning-paths')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class LearningPathsAdminController {
  constructor(private readonly learningPathsService: LearningPathsService) {}

  @Get()
  list() {
    return this.learningPathsService.listAdmin();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.learningPathsService.getAdminById(id);
  }

  @Post()
  create(@Body() dto: UpsertLearningPathDto) {
    return this.learningPathsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertLearningPathDto) {
    return this.learningPathsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.learningPathsService.delete(id, req.user.userId);
  }

  @Patch(':id/courses')
  setCourses(@Param('id') id: string, @Body() dto: SetPathCoursesDto) {
    return this.learningPathsService.setCourses(id, dto);
  }
}
