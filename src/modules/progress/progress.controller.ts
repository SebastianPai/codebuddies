import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { CreateProgressDto } from './dto/create-progress.dto';

@Controller('progress')
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Post()
  async create(@Body() dto: CreateProgressDto) {
    return this.progressService.createProgress(dto);
  }

  @Get('user/:userId')
  async getUserProgress(@Param('userId') userId: string) {
    return this.progressService.getUserProgress(userId);
  }
}
