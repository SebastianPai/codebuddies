import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PaddleClientService } from '../../paddle/paddle-client.service';
import {
  PaymentCheckoutRequest,
  PaymentCheckoutResult,
  PaymentProvider,
} from '../types/payment-provider.types';

// El monto de un certificado varía según la orden (courses distintos podrían
// tener precios distintos a futuro), así que se arma un precio ad-hoc en
// vez de referenciar un price_id fijo — Paddle igual requiere un
// product_id preexistente para poder facturarlo (PADDLE_CERTIFICATE_PRODUCT_ID).
@Injectable()
export class PaddlePaymentProvider implements PaymentProvider {
  constructor(private readonly paddleClient: PaddleClientService) {}

  async createCheckout(
    request: PaymentCheckoutRequest,
  ): Promise<PaymentCheckoutResult> {
    const productId = process.env[request.productIdEnvVar];
    if (!productId) {
      throw new InternalServerErrorException(
        `${request.productIdEnvVar} no está configurado`,
      );
    }

    const transaction = await this.paddleClient.createTransaction({
      items: [
        {
          quantity: 1,
          price: {
            description: request.description,
            product_id: productId,
            // Paddle espera el monto en la unidad menor de la moneda (ej.
            // centavos para USD) como string.
            unit_price: {
              amount: Math.round(request.amount * 100).toString(),
              currency_code: request.currency,
            },
          },
        },
      ],
      customData: { kind: request.kind, orderId: request.orderId },
    });

    return {
      providerPaymentId: transaction.id,
      checkoutUrl: transaction.checkout?.url ?? '',
    };
  }
}
