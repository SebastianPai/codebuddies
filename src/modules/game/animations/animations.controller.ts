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
import { AnimationsService } from './animations.service';
import { CreateAnimationDto } from './dto/create-animation.dto';
import { UpdateAnimationDto } from './dto/update-animation.dto';
import { AnimationType } from '@prisma/client';

@Controller('animations')
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
