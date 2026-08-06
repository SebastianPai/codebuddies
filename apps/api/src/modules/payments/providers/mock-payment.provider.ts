import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PaymentCheckoutRequest,
  PaymentCheckoutResult,
  PaymentProvider,
} from '../types/payment-provider.types';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  async createCheckout(
    request: PaymentCheckoutRequest,
  ): Promise<PaymentCheckoutResult> {
    const paymentId = `mock_pay_${randomUUID()}`;

    return {
      providerPaymentId: paymentId,
      checkoutUrl: `mock://payments/${request.orderId}/${paymentId}`,
    };
  }
}
