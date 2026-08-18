import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RankingsController } from './rankings.controller';
import { RankingsService } from './rankings.service';
import { AdminRankingsController } from './admin-rankings.controller';
import { RankingSeasonsService } from './ranking-seasons.service';

@Module({
  imports: [PrismaModule, NotificationsModule, RealtimeModule],
  controllers: [RankingsController, AdminRankingsController],
  providers: [RankingsService, RankingSeasonsService],
})
export class RankingsModule {}
