import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IdentityModule } from '../identity/identity.module';
import { ReferralsController } from './controllers/referrals.controller';
import { ReferralsAdminController } from './controllers/referrals-admin.controller';
import { ReferralAdminService } from './services/referral-admin.service';
import { ReferralFraudService } from './services/referral-fraud.service';
import { ReferralJobsService } from './services/referral-jobs.service';
import { ReferralRankingService } from './services/referral-ranking.service';
import { ReferralRewardService } from './services/referral-reward.service';
import { ReferralsService } from './services/referrals.service';
import { ReferralSettingsService } from './services/referral-settings.service';
import { ReferralValidationService } from './services/referral-validation.service';
import { RewardDispatcherService } from './services/reward-dispatcher.service';

@Module({
  imports: [PrismaModule, NotificationsModule, IdentityModule],
  controllers: [ReferralsController, ReferralsAdminController],
  providers: [
    ReferralsService,
    ReferralSettingsService,
    ReferralRewardService,
    RewardDispatcherService,
    ReferralRankingService,
    ReferralValidationService,
    ReferralFraudService,
    ReferralAdminService,
    ReferralJobsService,
  ],
  exports: [ReferralsService, ReferralValidationService],
})
export class ReferralsModule {}
