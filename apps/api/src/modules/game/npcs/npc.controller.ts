import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { Roles } from '../../identity/decorators/roles.decorator';
import { NpcService } from './npc.service';

@Controller('npcs')
@UseGuards(JwtAuthGuard)
export class NpcPublicController {
  constructor(private readonly service: NpcService) {}

  @Get()
  list(@Query('kind') kind?: string) {
    return this.service.listEnabled(kind);
  }
}

@Controller('admin/npcs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class NpcAdminController {
  constructor(private readonly service: NpcService) {}

  @Get()
  list(@Query('kind') kind?: string) {
    return this.service.listAll(kind);
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
