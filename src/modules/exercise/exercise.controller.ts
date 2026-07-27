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
import { ExerciseService } from './exercise.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';

@Controller('exercises')
export class ExerciseController {
  constructor(private exerciseService: ExerciseService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body() dto: CreateExerciseDto) {
    return this.exerciseService.createExercise(dto);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAdminExercises(@Query('lang') lang = 'es') {
    return this.exerciseService.getAdminExercises(lang);
  }

  @Get('lesson/:lessonId')
  async getByLesson(
    @Param('lessonId') lessonId: string,
    @Query('lang') lang = 'es',
    @Query('userId') userId?: string,
  ) {
    return this.exerciseService.getExercisesByLesson(lessonId, userId, lang);
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @Query('lang') lang = 'es',
    @Query('userId') userId?: string,
  ) {
    return this.exerciseService.getExerciseById(id, userId, lang);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.exerciseService.updateExercise(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    return this.exerciseService.deleteExercise(id);
  }
}
