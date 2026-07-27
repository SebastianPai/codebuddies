import { Inject, Injectable } from '@nestjs/common';
import { PremiumSubscriptionsRepository } from '../repositories/premium-subscriptions.repository';
import { SUBSCRIPTION_PROVIDER } from '../types/subscription-provider.types';
import type { SubscriptionProvider } from '../types/subscription-provider.types';

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

  async createPremiumCheckout(userId: string) {
    return this.subscriptionProvider.createCheckout({
      userId,
      planCode: 'premium-monthly',
      monthlyAmount: 9.99,
      currency: 'USD',
    });
  }
}
