import { Inject, Injectable } from '@nestjs/common';
import { PremiumSubscriptionsRepository } from '../repositories/premium-subscriptions.repository';
import { SUBSCRIPTION_PROVIDER } from '../types/subscription-provider.types';
import type {
  BillingInterval,
  SubscriptionProvider,
} from '../types/subscription-provider.types';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly premiumSubscriptionsRepository: PremiumSubscriptionsRepository,
    @Inject(SUBSCRIPTION_PROVIDER)
    private readonly subscriptionProvider: SubscriptionProvider,
  ) {}

  getActivePremiumSubscription(userId: string) {
    return this.premiumSubscriptionsRepository.findActiveByUser(userId);
  }

  async createPremiumCheckout(
    userId: string,
    billingInterval: BillingInterval,
    customerEmail?: string,
  ) {
    return this.subscriptionProvider.createCheckout({
      userId,
      planCode: billingInterval === 'yearly' ? 'premium-yearly' : 'premium-monthly',
      monthlyAmount: 9.99,
      currency: 'USD',
      billingInterval,
      customerEmail,
    });
  }
}
