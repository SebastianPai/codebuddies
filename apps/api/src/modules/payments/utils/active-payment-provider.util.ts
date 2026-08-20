import { PaymentProviderType } from '@prisma/client';

// Mismo criterio que ya usan las fábricas de PAYMENT_PROVIDER/
// SUBSCRIPTION_PROVIDER (payments.module.ts, subscriptions.module.ts) para
// elegir entre el provider real y el mock -- se centraliza acá para que
// las filas de CertificateOrder/CoinPurchase registren qué provider se usó
// realmente en vez de quedarse siempre en el default MOCK del schema.
export function getActivePaymentProviderType(): PaymentProviderType {
  return process.env.PADDLE_API_KEY
    ? PaymentProviderType.PADDLE
    : PaymentProviderType.MOCK;
}
