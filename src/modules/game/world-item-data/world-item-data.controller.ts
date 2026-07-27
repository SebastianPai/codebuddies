import { Controller, Get, Patch, Delete, Param, Body } from '@nestjs/common';

import { WorldItemDataService } from './world-item-data.service';

import { UpdateWorldItemDto } from './dto/update-world-item.dto';

@Controller('world-item-data')
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
