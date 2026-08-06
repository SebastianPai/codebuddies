import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { RewardService } from '../game/reward/reward.service';
import { PremiumAccessModule } from '../premium-access/premium-access.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StreakReminderService } from './streak-reminder.service';

@Module({
  imports: [PrismaModule, ReferralsModule, PremiumAccessModule, NotificationsModule],
  providers: [ProgressService, RewardService, StreakReminderService],
  controllers: [ProgressController],
  exports: [ProgressService],
})
export class ProgressModule {}
