import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { SubscriptionsService } from '../services/subscriptions.service';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request.type';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('premium/me')
  @UseGuards(JwtAuthGuard)
  getMyPremiumSubscription(@Req() req: AuthenticatedRequest) {
    return this.subscriptionsService.getActivePremiumSubscription(
      req.user.userId,
    );
  }

  @Post('premium/checkout')
  @UseGuards(JwtAuthGuard)
  createPremiumCheckout(@Req() req: AuthenticatedRequest) {
    return this.subscriptionsService.createPremiumCheckout(req.user.userId);
  }
}
