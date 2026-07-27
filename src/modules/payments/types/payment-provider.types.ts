export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface PaymentCheckoutRequest {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
}

export interface PaymentCheckoutResult {
  providerPaymentId: string;
  checkoutUrl: string;
}

export interface PaymentProvider {
  createCheckout(
    request: PaymentCheckoutRequest,
  ): Promise<PaymentCheckoutResult>;
}
