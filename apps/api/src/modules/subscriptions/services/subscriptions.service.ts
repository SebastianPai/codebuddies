import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaddleSdkService } from '../../paddle/paddle-sdk.service';
import { PremiumSubscriptionsRepository } from '../repositories/premium-subscriptions.repository';
import { SUBSCRIPTION_PROVIDER } from '../types/subscription-provider.types';
import type {
  BillingInterval,
  SubscriptionProvider,
} from '../types/subscription-provider.types';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly premiumSubscriptionsRepository: PremiumSubscriptionsRepository,
    private readonly paddleSdkService: PaddleSdkService,
    @Inject(SUBSCRIPTION_PROVIDER)
    private readonly subscriptionProvider: SubscriptionProvider,
  ) {}

  getActivePremiumSubscription(userId: string) {
    return this.premiumSubscriptionsRepository.findActiveByUser(userId);
  }

  // El customer_id de Paddle se resuelve del usuario autenticado (nunca de
  // algo que mande el frontend, ver PaddleWebhookService.linkPaddleCustomer
  // para cómo se llena este campo la primera vez que el usuario paga algo).
  async getBillingPortalUrl(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { paddleCustomerId: true },
    });

    if (!user?.paddleCustomerId) {
      throw new BadRequestException(
        'Todavía no tenés una compra registrada en Paddle -- el portal de facturación queda disponible después de tu primera compra o suscripción.',
      );
    }

    const activeSubscription =
      await this.premiumSubscriptionsRepository.findActiveByUser(userId);
    const subscriptionIds = activeSubscription?.providerSubscriptionId
      ? [activeSubscription.providerSubscriptionId]
      : [];

    return this.paddleSdkService.createCustomerPortalSession(
      user.paddleCustomerId,
      subscriptionIds,
    );
  }

  // Guarda real contra pagos duplicados: sin esto, nada impedía que un
  // usuario con Premium ya activo iniciara y pagara un checkout nuevo --
  // Paddle cobra igual aunque ya exista una suscripción activa en nuestra
  // DB, porque para Paddle es una suscripción nueva y legítima. Ver el
  // incidente real: dos filas PremiumSubscription (origin PAYMENT) para la
  // misma cuenta, una semana de diferencia, ambas cobradas de verdad.
  async createPremiumCheckout(
    userId: string,
    billingInterval: BillingInterval,
    customerEmail?: string,
  ) {
    const activeSubscription = await this.getActivePremiumSubscription(userId);
    if (activeSubscription) {
      throw new BadRequestException(
        `Ya tenés una suscripción Premium activa hasta ${activeSubscription.expiresAt.toISOString().slice(0, 10)}. No hace falta pagar de nuevo -- usá el portal de facturación para cambiar o cancelar tu plan.`,
      );
    }

    return this.subscriptionProvider.createCheckout({
      userId,
      planCode:
        billingInterval === 'yearly' ? 'premium-yearly' : 'premium-monthly',
      monthlyAmount: 9.99,
      currency: 'USD',
      billingInterval,
      customerEmail,
    });
  }
}
