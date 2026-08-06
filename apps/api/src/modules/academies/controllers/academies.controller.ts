import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AcademyType } from '@prisma/client';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { CreateAcademyDto } from '../dto/create-academy.dto';
import { UpdateAcademyDto } from '../dto/update-academy.dto';
import { AcademiesService } from '../services/academies.service';

@Controller('academies')
export class AcademiesController {
  constructor(private readonly academiesService: AcademiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateAcademyDto) {
    return this.academiesService.create(dto);
  }

  @Get()
  findAll(@Query('active') active?: string, @Query('type') type?: AcademyType) {
    return this.academiesService.findAll({
      active: active === undefined ? undefined : active === 'true',
      type,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.academiesService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateAcademyDto) {
    return this.academiesService.update(id, dto);
  }
}
