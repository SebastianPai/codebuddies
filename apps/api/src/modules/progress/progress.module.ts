import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { RewardService } from '../game/reward/reward.service';
import { PremiumAccessModule } from '../premium-access/premium-access.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StreakReminderService } from './streak-reminder.service';
import { BattlePassModule } from '../battle-pass/battle-pass.module';

@Module({
  imports: [PrismaModule, ReferralsModule, PremiumAccessModule, NotificationsModule, BattlePassModule],
  providers: [ProgressService, RewardService, StreakReminderService],
  controllers: [ProgressController],
  exports: [ProgressService],
})
export class ProgressModule {}
