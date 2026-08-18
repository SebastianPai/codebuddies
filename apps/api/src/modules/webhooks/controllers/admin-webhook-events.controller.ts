import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { WebhookEventsRepository } from '../webhook-events.repository';
import { ListWebhookEventsDto } from '../dto/list-webhook-events.dto';

@Controller('admin/webhook-events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminWebhookEventsController {
  constructor(private readonly repository: WebhookEventsRepository) {}

  @Get()
  list(@Query() query: ListWebhookEventsDto) {
    return this.repository.listForAdmin(query.page, query.limit, {
      status: query.status,
      provider: query.provider,
    });
  }

  @Get('stale')
  listStale() {
    return this.repository.findStale();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const event = await this.repository.findById(id);
    if (!event) throw new NotFoundException('Webhook event not found');
    return event;
  }
}
