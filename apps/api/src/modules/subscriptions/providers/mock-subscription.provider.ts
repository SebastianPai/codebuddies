import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  SubscriptionCheckoutRequest,
  SubscriptionCheckoutResult,
  SubscriptionProvider,
} from '../types/subscription-provider.types';

@Injectable()
export class MockSubscriptionProvider implements SubscriptionProvider {
  async createCheckout(
    request: SubscriptionCheckoutRequest,
  ): Promise<SubscriptionCheckoutResult> {
    const subscriptionId = `mock_sub_${randomUUID()}`;

    return {
      providerSubscriptionId: subscriptionId,
      checkoutUrl: `mock://subscriptions/${request.userId}/${subscriptionId}`,
    };
  }
}
