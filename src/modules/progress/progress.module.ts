import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { RewardService } from '../game/reward/reward.service';

@Module({
  imports: [PrismaModule, ReferralsModule],
  providers: [ProgressService, RewardService],
  controllers: [ProgressController],
})
export class ProgressModule {}
