import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { LayoutsService } from './layouts.service';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { Roles } from '../../identity/decorators/roles.decorator';

// Solo el panel admin (apps/web) gestiona layouts; el juego los consume vía
// LayoutsService inyectado directo en RoomHandler/RoomsService, nunca por
// esta API. Sin esto, cualquiera podía crear un layout con width/height
// arbitrarios (ver módulo de DoS en room-items) sin autenticarse siquiera.
@Controller('layouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class LayoutsController {
  constructor(private readonly layoutsService: LayoutsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) {
    return this.layoutsService.createLayout(body);
  }

  @Get()
  getAll() {
    return this.layoutsService.getLayouts();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.layoutsService.getLayoutById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.layoutsService.updateLayout(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.layoutsService.deleteLayout(id);
  }
}
