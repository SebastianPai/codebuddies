import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import { EventLogService, type EventLogQuery } from './event-log.service';

@Controller('admin/history')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class EventLogController {
  constructor(private readonly events: EventLogService) {}

  @Get()
  list(@Query() query: EventLogQuery) {
    return this.events.list(query);
  }

  @Get('summary')
  summary() {
    return this.events.summary();
  }

  @Get('coins')
  coins(@Query() query: EventLogQuery) {
    return this.events.coinMovements(query);
  }
}
