import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';

import { ItemSpritesService } from './item-sprites.service';
import { CreateItemSpriteDto } from './dto/create-item-sprite.dto';
import { UpdateItemSpriteDto } from './dto/update-item-sprite.dto';

@Controller('item-sprites')
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
