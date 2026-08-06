import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AvatarItemsService } from './avatar-items.service';
import { AvatarSlotType } from '@prisma/client';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { Roles } from '../../identity/decorators/roles.decorator';

// Solo lo usa el panel admin (apps/web); el juego consume AvatarItemsService
// directo por WebSocket, nunca esta API REST.
@Controller('avatar-items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AvatarItemsController {
  constructor(private service: AvatarItemsService) {}

  @Post()
  create(@Body() body: { itemId: string; slot: AvatarSlotType }) {
    return this.service.create(body.itemId, body.slot);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { slot?: AvatarSlotType; itemId?: string },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
