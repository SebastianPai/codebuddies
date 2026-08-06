import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Delete,
  UseGuards,
  Query,
  Patch,
} from '@nestjs/common';

import { ModuleService } from './module.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';

@Controller('modules')
export class ModuleController {
  constructor(private moduleService: ModuleService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body() dto: CreateModuleDto) {
    return this.moduleService.createModule(dto);
  }

  // 🔥 ADMIN ROUTES PRIMERO

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAdminModules() {
    return this.moduleService.getModulesForAdmin();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAdminModule(@Param('id') id: string) {
    return this.moduleService.getModuleForAdmin(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateModuleDto) {
    return this.moduleService.updateModule(id, dto);
  }

  // 🔥 USER ROUTES DESPUÉS

  @Get()
  async findAll(@Query('lang') lang = 'es') {
    return this.moduleService.getAllModules(lang);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('lang') lang = 'es') {
    return this.moduleService.getModuleById(id, lang);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.moduleService.deleteModule(id);
  }
}
