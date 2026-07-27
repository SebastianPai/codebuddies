export const SUBSCRIPTION_PROVIDER = Symbol('SUBSCRIPTION_PROVIDER');

export interface SubscriptionCheckoutRequest {
  userId: string;
  planCode: string;
  monthlyAmount: number;
  currency: string;
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
