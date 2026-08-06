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
import { Throttle } from '@nestjs/throttler';
import { ExerciseService } from './exercise.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ReorderDto } from '../../common/dto/reorder.dto';
import { SubmitQuizAnswerDto } from './dto/submit-quiz-answer.dto';
import { SubmitCodeAnswerDto } from './dto/submit-code-answer.dto';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { OptionalJwtAuthGuard } from '../identity/guards/optional-jwt.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import type {
  AuthenticatedRequest,
  OptionallyAuthenticatedRequest,
} from '../../common/types/authenticated-request.type';

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
  @UseGuards(OptionalJwtAuthGuard)
  async getByLesson(
    @Req() req: OptionallyAuthenticatedRequest,
    @Param('lessonId') lessonId: string,
    @Query('lang') lang = 'es',
  ) {
    return this.exerciseService.getExercisesByLesson(
      lessonId,
      req.user?.userId,
      lang,
      req.user?.role,
    );
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getById(
    @Req() req: OptionallyAuthenticatedRequest,
    @Param('id') id: string,
    @Query('lang') lang = 'es',
  ) {
    return this.exerciseService.getExerciseById(
      id,
      req.user?.userId,
      lang,
      req.user?.role,
    );
  }

  @Post(':id/quiz/answer')
  @UseGuards(JwtAuthGuard)
  async submitQuizAnswer(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: SubmitQuizAnswerDto,
  ) {
    return this.exerciseService.submitQuizAnswer(
      req.user.userId,
      id,
      dto,
      req.user.role,
    );
  }

  @Post(':id/code/submit')
  @UseGuards(JwtAuthGuard)
  // Ejecuta código del estudiante server-side (ver runCodeTests) — límite
  // explícito además del throttling global, dado el costo/riesgo mayor de
  // esta ruta particular.
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async submitCodeAnswer(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: SubmitCodeAnswerDto,
  ) {
    return this.exerciseService.submitCodeAnswer(
      req.user.userId,
      id,
      dto,
      req.user.role,
    );
  }

  // Debe ir antes de :id para no matchear "reorder" como id
  @Patch('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async reorder(@Body() dto: ReorderDto) {
    return this.exerciseService.reorderExercises(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateExerciseDto) {
    return this.exerciseService.updateExercise(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    return this.exerciseService.deleteExercise(id);
  }
}
