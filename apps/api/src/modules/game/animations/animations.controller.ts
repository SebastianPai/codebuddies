import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnimationsService } from './animations.service';
import { CreateAnimationDto } from './dto/create-animation.dto';
import { UpdateAnimationDto } from './dto/update-animation.dto';
import { AnimationType } from '@prisma/client';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { Roles } from '../../identity/decorators/roles.decorator';

// Solo el panel admin (apps/web); el juego lee animaciones vía
// AnimationsService inyectado directo en los handlers de WebSocket, nunca
// por esta API.
@Controller('animations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AnimationsController {
  constructor(private readonly service: AnimationsService) {}

  // CREATE
  @Post()
  create(@Body() dto: CreateAnimationDto) {
    return this.service.create(dto);
  }

  // GET ALL o FILTER
  @Get()
  findAll(@Query('type') type?: AnimationType) {
    if (type) return this.service.findByType(type);
    return this.service.findAll();
  }

  @Get('/variants')
  getVariants(@Query('type') type: AnimationType) {
    return this.service.getVariants(type);
  }

  // GET ONE
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // UPDATE
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAnimationDto) {
    return this.service.update(id, dto);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
