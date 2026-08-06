import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaddleClientModule } from '../paddle/paddle-client.module';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { MockSubscriptionProvider } from './providers/mock-subscription.provider';
import { PaddleSubscriptionProvider } from './providers/paddle-subscription.provider';
import { PremiumSubscriptionsRepository } from './repositories/premium-subscriptions.repository';
import { SubscriptionsService } from './services/subscriptions.service';
import { SUBSCRIPTION_PROVIDER } from './types/subscription-provider.types';

@Module({
  imports: [PrismaModule, PaddleClientModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    PremiumSubscriptionsRepository,
    MockSubscriptionProvider,
    PaddleSubscriptionProvider,
    {
      provide: SUBSCRIPTION_PROVIDER,
      useFactory: (
        mock: MockSubscriptionProvider,
        paddle: PaddleSubscriptionProvider,
      ) => (process.env.PADDLE_API_KEY ? paddle : mock),
      inject: [MockSubscriptionProvider, PaddleSubscriptionProvider],
    },
  ],
  exports: [
    SubscriptionsService,
    PremiumSubscriptionsRepository,
    SUBSCRIPTION_PROVIDER,
  ],
})
export class SubscriptionsModule {}
