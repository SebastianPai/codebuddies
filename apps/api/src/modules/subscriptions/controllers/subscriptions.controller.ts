import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { SubscriptionsService } from '../services/subscriptions.service';
import { CreatePremiumCheckoutDto } from '../dto/create-premium-checkout.dto';
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

  // GET, no POST: solo lee/crea una sesión de portal de un lado (Paddle),
  // no muta nada nuestro -- el frontend hace fetch autenticado y redirige
  // (window.location.href) a la URL devuelta, no navega directo acá (un
  // GET de navegador normal no llevaría el Bearer token).
  @Get('premium/billing-portal')
  @UseGuards(JwtAuthGuard)
  async getBillingPortalUrl(@Req() req: AuthenticatedRequest) {
    const url = await this.subscriptionsService.getBillingPortalUrl(
      req.user.userId,
    );
    return { url };
  }

  @Post('premium/checkout')
  @UseGuards(JwtAuthGuard)
  createPremiumCheckout(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePremiumCheckoutDto,
  ) {
    return this.subscriptionsService.createPremiumCheckout(
      req.user.userId,
      dto.billingInterval,
      req.user.email,
    );
  }
}
