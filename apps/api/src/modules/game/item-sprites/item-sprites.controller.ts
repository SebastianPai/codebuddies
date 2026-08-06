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

import { ItemSpritesService } from './item-sprites.service';
import { CreateItemSpriteDto } from './dto/create-item-sprite.dto';
import { UpdateItemSpriteDto } from './dto/update-item-sprite.dto';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { Roles } from '../../identity/decorators/roles.decorator';

// Solo el panel admin (apps/web); el juego lee sprites vía ItemSpritesService
// inyectado directo en los handlers de WebSocket, nunca por esta API.
@Controller('item-sprites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ItemSpritesController {
  constructor(private service: ItemSpritesService) {}

  // CREATE
  @Post()
  create(@Body() dto: CreateItemSpriteDto) {
    return this.service.create(dto);
  }

  // GET ALL / FILTERS
  @Get()
  findAll(
    @Query('itemId') itemId?: string,
    @Query('animationId') animationId?: string,
  ) {
    if (itemId && animationId) {
      return this.service.findByItemAndAnimation(itemId, animationId);
    }

    if (itemId) {
      return this.service.findByItem(itemId);
    }

    return this.service.findAll();
  }

  // GET ONE
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // UPDATE
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateItemSpriteDto) {
    return this.service.update(id, dto);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
