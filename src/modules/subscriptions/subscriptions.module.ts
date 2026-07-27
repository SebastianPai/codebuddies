import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { MockSubscriptionProvider } from './providers/mock-subscription.provider';
import { PremiumSubscriptionsRepository } from './repositories/premium-subscriptions.repository';
import { SubscriptionsService } from './services/subscriptions.service';
import { SUBSCRIPTION_PROVIDER } from './types/subscription-provider.types';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    PremiumSubscriptionsRepository,
    MockSubscriptionProvider,
    { provide: SUBSCRIPTION_PROVIDER, useExisting: MockSubscriptionProvider },
  ],
  exports: [
    SubscriptionsService,
    PremiumSubscriptionsRepository,
    SUBSCRIPTION_PROVIDER,
  ],
})
export class SubscriptionsModule {}
