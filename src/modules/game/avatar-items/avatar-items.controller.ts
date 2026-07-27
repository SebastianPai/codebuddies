import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { AvatarItemsService } from './avatar-items.service';
import { AvatarSlotType } from '@prisma/client';

@Controller('avatar-items')
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
