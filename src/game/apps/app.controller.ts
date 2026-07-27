// src/modules/apps/apps.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseGuards,
  Req,
  Put, // ← nuevo
} from '@nestjs/common';
import { AppService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateLogicDto } from './dto/update-logic.dto';
import { JwtAuthGuard } from '../../modules/identity/guards/jwt.guard';

@Controller('apps')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req, @Body() dto: CreateAppDto) {
    return this.appService.createApp(req.user.userId, dto.type);
  }

  // ←←← NUEVO: Actualizar lógica
  @Put(':id/logic')
  @UseGuards(JwtAuthGuard)
  updateLogic(@Param('id') id: string, @Body() dto: UpdateLogicDto) {
    return this.appService.updateLogic(id, dto.logic);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(@Param('id') id: string) {
    return this.appService.publishApp(id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyApps(@Req() req) {
    return this.appService.getUserApps(req.user.userId);
  }

  // ←←← NUEVO: Obtener una app específica
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getApp(@Param('id') id: string) {
    return this.appService.getAppById(id);
  }

  @Get()
  getPublishedApps() {
    return this.appService.getPublishedApps();
  }
}
