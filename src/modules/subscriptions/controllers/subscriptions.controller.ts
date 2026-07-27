import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { SubscriptionsService } from '../services/subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('premium/me')
  @UseGuards(JwtAuthGuard)
  getMyPremiumSubscription(@Req() req) {
    return this.subscriptionsService.getActivePremiumSubscription(
      req.user.userId,
    );
  }
}
