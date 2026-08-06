import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';

import { WorldItemDataService } from './world-item-data.service';

import { UpdateWorldItemDto } from './dto/update-world-item.dto';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { Roles } from '../../identity/decorators/roles.decorator';

// Reglas de colisión/apilamiento del mundo: solo el panel admin (apps/web)
// las edita; el motor del juego las lee vía WorldItemDataService inyectado
// directo en los handlers de WebSocket, nunca por esta API.
@Controller('world-item-data')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class WorldItemDataController {
  constructor(private readonly worldItemDataService: WorldItemDataService) {}

  @Get()
  async findAll() {
    return this.worldItemDataService.findAll();
  }

  @Get(':itemId')
  async findOne(@Param('itemId') itemId: string) {
    return this.worldItemDataService.findOne(itemId);
  }

  @Patch(':itemId')
  async update(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateWorldItemDto,
  ) {
    return this.worldItemDataService.update(itemId, dto);
  }

  @Delete(':itemId')
  async remove(@Param('itemId') itemId: string) {
    return this.worldItemDataService.remove(itemId);
  }
}
