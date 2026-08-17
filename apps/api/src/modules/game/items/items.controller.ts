import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateAvatarItemDto } from './dto/create-avatar-item.dto';
import { CreateWorldItemDto } from './dto/create-world-item.dto';
import { AvatarSlotType, WorldItemKind } from '@prisma/client';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { Roles } from '../../identity/decorators/roles.decorator';

// Catálogo de ítems/economía: solo lo consume el panel admin (apps/web).
// El cliente del juego lee estos datos vía WebSocket (ItemsService inyectado
// directo en los handlers de shop/inventory/room-items), nunca por esta API,
// así que gatear todo el controlador con ADMIN no afecta al juego en vivo.
@Controller('items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  // ───────────── Item base ─────────────
  @Post()
  async create(@Body() dto: CreateItemDto) {
    return this.itemsService.createItem(dto);
  }

  @Get()
  async findAll(@Query('type') type?: string) {
    return type
      ? this.itemsService.findByType(type)
      : this.itemsService.findAllItems();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.itemsService.findItemById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.updateItem(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.itemsService.removeItem(id);
  }

  @Patch(':id/default-for-slot')
  async setDefaultForSlot(
    @Param('id') id: string,
    @Body('isDefault') isDefault: boolean,
  ) {
    return this.itemsService.setDefaultForSlot(id, Boolean(isDefault));
  }

  // ───────────── Avatar Items ─────────────
  @Post('avatar')
  async createAvatarItem(@Body() dto: CreateAvatarItemDto) {
    return this.itemsService.createAvatarItem(
      dto.itemId,
      dto.slot ?? AvatarSlotType.BODY,
    );
  }

  @Get('avatar')
  async findAllAvatarItems() {
    return this.itemsService.findAllAvatarItems();
  }

  @Get('avatar/:id')
  async findAvatarItem(@Param('id') id: string) {
    return this.itemsService.findAvatarItemById(id);
  }

  @Delete('avatar/:id')
  async removeAvatarItem(@Param('id') id: string) {
    return this.itemsService.removeAvatarItem(id);
  }

  // ───────────── World Items ─────────────
  @Post('world')
  async createWorldItem(@Body() dto: CreateWorldItemDto) {
    return this.itemsService.createWorldItem(
      dto.itemId,
      dto.width,
      dto.height,
      dto.kind as WorldItemKind,
      dto.isCollidable,
      dto.isInteractable,
    );
  }

  @Get('world')
  async findAllWorldItems() {
    return this.itemsService.findAllWorldItems();
  }

  @Get('world/:id')
  async findWorldItem(@Param('id') id: string) {
    return this.itemsService.findWorldItemById(id);
  }

  @Delete('world/:id')
  async removeWorldItem(@Param('id') id: string) {
    return this.itemsService.removeWorldItem(id);
  }
}
