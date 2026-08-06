import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { GamificationAdminController } from './gamification-admin.controller';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';

@Module({
  imports: [PrismaModule, NotificationsModule, RealtimeModule],
  controllers: [GamificationController, GamificationAdminController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
