export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface PaymentCheckoutRequest {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  // Qué se está cobrando (va en custom_data del checkout para que el
  // webhook sepa qué hacer al confirmarse el pago) y qué variable de
  // entorno tiene el product_id de Paddle correspondiente — así un solo
  // PaddlePaymentProvider sirve para certificados, coins, o lo que se
  // agregue después, sin duplicar la clase por cada producto.
  kind: string;
  productIdEnvVar: string;
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
