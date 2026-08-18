export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface PaymentCheckoutRequest {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  // Qué se está cobrando (va en custom_data del checkout para que el
  // webhook sepa qué hacer al confirmarse el pago).
  kind: string;
  // Ad-hoc: product_id preexistente + precio armado en el momento con
  // `amount`/`currency` de arriba (certificados, cuyo monto puede variar a
  // futuro por curso). Mutuamente excluyente con priceIdEnvVar.
  productIdEnvVar?: string;
  // Precio fijo preconfigurado en el dashboard de Paddle (paquetes de
  // monedas: cada paquete es su propio product+price real en Paddle, no un
  // product genérico con precio ad-hoc). Mutuamente excluyente con
  // productIdEnvVar.
  priceIdEnvVar?: string;
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
