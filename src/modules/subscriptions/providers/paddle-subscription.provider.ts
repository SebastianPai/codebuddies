import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PaddleClientService } from '../../paddle/paddle-client.service';
import {
  SubscriptionCheckoutRequest,
  SubscriptionCheckoutResult,
  SubscriptionProvider,
} from '../types/subscription-provider.types';

// El registro real de PremiumSubscription no se crea acá: se crea cuando
// llega el webhook subscription.created una vez que el pago se confirma
// (ver PaddleWebhookService). Acá solo se arranca el checkout con un price
// recurrente preconfigurado en el dashboard de Paddle
// (PADDLE_PREMIUM_PRICE_ID) y se le pasa el userId en custom_data para que
// el webhook sepa a quién pertenece la suscripción que se está creando.
@Injectable()
export class PaddleSubscriptionProvider implements SubscriptionProvider {
  constructor(private readonly paddleClient: PaddleClientService) {}

  async createCheckout(
    request: SubscriptionCheckoutRequest,
  ): Promise<SubscriptionCheckoutResult> {
    const priceId = process.env.PADDLE_PREMIUM_PRICE_ID;
    if (!priceId) {
      throw new InternalServerErrorException(
        'PADDLE_PREMIUM_PRICE_ID no está configurado',
      );
    }

    const transaction = await this.paddleClient.createTransaction({
      items: [{ price_id: priceId, quantity: 1 }],
      customData: { kind: 'premium_subscription', userId: request.userId },
    });

    return {
      // Provisorio: es el id de la transacción de arranque, no el de la
      // suscripción — la suscripción real todavía no existe en Paddle hasta
      // que se confirme el pago. El webhook la crea con su id definitivo.
      providerSubscriptionId: transaction.id,
      checkoutUrl: transaction.checkout?.url ?? '',
    };
  }
}
