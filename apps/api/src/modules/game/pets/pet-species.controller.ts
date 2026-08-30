import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { Roles } from '../../identity/decorators/roles.decorator';
import { PetSpeciesService } from './pet-species.service';

// Lectura pública (el juego necesita saber qué sprite usar por especie).
@Controller('pet-species')
@UseGuards(JwtAuthGuard)
export class PetSpeciesPublicController {
  constructor(private readonly service: PetSpeciesService) {}

  @Get()
  list() {
    return this.service.listEnabled();
  }
}

// CRUD solo admin -> lo consume /admin/pets.
@Controller('admin/pet-species')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PetSpeciesAdminController {
  constructor(private readonly service: PetSpeciesService) {}

  @Get()
  list() {
    return this.service.listAll();
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body ?? {});
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body ?? {});
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
