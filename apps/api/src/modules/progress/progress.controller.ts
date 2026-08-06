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
import { ProgressService } from './progress.service';
import { CreateProgressDto } from './dto/create-progress.dto';
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
