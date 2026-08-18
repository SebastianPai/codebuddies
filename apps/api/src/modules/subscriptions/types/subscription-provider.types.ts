export const SUBSCRIPTION_PROVIDER = Symbol('SUBSCRIPTION_PROVIDER');

export type BillingInterval = 'monthly' | 'yearly';

export interface SubscriptionCheckoutRequest {
  userId: string;
  planCode: string;
  monthlyAmount: number;
  currency: string;
  billingInterval: BillingInterval;
  customerEmail?: string;
}

export interface SubscriptionCheckoutResult {
  providerSubscriptionId: string;
  checkoutUrl: string;
}

export interface SubscriptionProvider {
  createCheckout(
    request: SubscriptionCheckoutRequest,
  ): Promise<SubscriptionCheckoutResult>;
}
