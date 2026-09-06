import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import { ProgressService } from './progress.service';
import { CreateProgressDto } from './dto/create-progress.dto';
import {
  AdminCompleteCourseDto,
  AdminResetProgressDto,
} from './dto/admin-progress.dto';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProgressDto,
  ) {
    return this.progressService.createProgress(
      req.user.userId,
      dto,
      req.user.role,
    );
  }

  // --- Herramientas de test SOLO admin: operan sobre el progreso del propio
  //     admin (nunca se pasa un userId de terceros). Sirven para probar las
  //     animaciones de recompensa y los estados de "completado".
  @Post('admin/complete-course')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminCompleteCourse(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AdminCompleteCourseDto,
  ) {
    return this.progressService.adminCompleteCourse(
      req.user.userId,
      dto.courseId,
      req.user.role,
    );
  }

  @Post('admin/reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminReset(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AdminResetProgressDto,
  ) {
    if (dto.scope === 'course') {
      if (!dto.courseId) {
        throw new ForbiddenException('courseId es obligatorio para scope=course');
      }
      return this.progressService.adminResetCourse(req.user.userId, dto.courseId);
    }
    if (!dto.lessonId) {
      throw new ForbiddenException('lessonId es obligatorio para scope=lesson');
    }
    return this.progressService.adminResetLesson(req.user.userId, dto.lessonId);
  }

  @Get('continue-learning')
  async getContinueLearning(
    @Req() req: AuthenticatedRequest,
    @Query('lang') lang = 'es',
    @Query('take') take?: string,
  ) {
    const parsed = take ? Number(take) : NaN;
    return this.progressService.getContinueLearning(
      req.user.userId,
      lang,
      Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
    );
  }

  @Get('user/:userId')
  async getUserProgress(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    if (req.user.userId !== userId && req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('No podés ver el progreso de otro usuario');
    }
    return this.progressService.getUserProgress(userId);
  }
}
