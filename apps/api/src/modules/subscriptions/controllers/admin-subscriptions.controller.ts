import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { PremiumSubscriptionsRepository } from '../repositories/premium-subscriptions.repository';
import { ListPremiumSubscriptionsDto } from '../dto/list-premium-subscriptions.dto';

@Controller('admin/premium')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSubscriptionsController {
  constructor(private readonly repository: PremiumSubscriptionsRepository) {}

  @Get('subscriptions')
  list(@Query() query: ListPremiumSubscriptionsDto) {
    return this.repository.listForAdmin(query.page, query.limit, {
      status: query.status,
      origin: query.origin,
      expiringSoon: query.expiringSoon,
    });
  }
}
