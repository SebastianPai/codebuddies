import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GamificationModule } from '../gamification/gamification.module';
import { PremiumAccessModule } from '../premium-access/premium-access.module';
import { BattlePassAdminController } from './controllers/battle-pass-admin.controller';
import { BattlePassController } from './controllers/battle-pass.controller';
import { BattlePassService } from './services/battle-pass.service';

@Module({
  imports: [PrismaModule, GamificationModule, PremiumAccessModule],
  controllers: [BattlePassController, BattlePassAdminController],
  providers: [BattlePassService],
  exports: [BattlePassService],
})
export class BattlePassModule {}
