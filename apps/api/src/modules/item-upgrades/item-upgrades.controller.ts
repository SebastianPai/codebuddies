import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { OptionalJwtAuthGuard } from '../identity/guards/optional-jwt.guard';
import { CreateItemUpgradeDto, UpdateItemUpgradeDto } from './item-upgrade.dto';
import { ItemUpgradesService } from './item-upgrades.service';

type Req = { user?: { userId: string; role?: string } };

@Controller()
export class ItemUpgradesController {
  constructor(private readonly service: ItemUpgradesService) {}

  // Público (sin sesión muestra solo el catálogo; con sesión, qué tiene).
  @Get('items/:itemId/upgrades')
  @UseGuards(OptionalJwtAuthGuard)
  list(@Param('itemId') itemId: string, @Req() req: Req) {
    return this.service.listForItem(itemId, req.user?.userId);
  }

  @Post('item-upgrades/:id/buy')
  @UseGuards(JwtAuthGuard)
  buy(@Param('id') id: string, @Req() req: Req) {
    return this.service.buy(req.user!.userId, id);
  }

  // Admin o creador dueño del objeto (lo valida el servicio).
  @Post('items/:itemId/upgrades')
  @UseGuards(JwtAuthGuard)
  create(@Param('itemId') itemId: string, @Body() dto: CreateItemUpgradeDto, @Req() req: Req) {
    return this.service.create(req.user!, itemId, dto);
  }

  @Patch('item-upgrades/:id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateItemUpgradeDto, @Req() req: Req) {
    return this.service.update(req.user!, id, dto);
  }

  @Delete('item-upgrades/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Req() req: Req) {
    return this.service.remove(req.user!, id);
  }
}
