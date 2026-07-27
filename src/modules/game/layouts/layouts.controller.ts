import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LayoutsService } from './layouts.service';

@Controller('layouts')
export class LayoutsController {
  constructor(private readonly layoutsService: LayoutsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) {
    return this.layoutsService.createLayout(body);
  }

  @Get()
  getAll() {
    return this.layoutsService.getLayouts();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.layoutsService.getLayoutById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.layoutsService.updateLayout(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.layoutsService.deleteLayout(id);
  }
}
