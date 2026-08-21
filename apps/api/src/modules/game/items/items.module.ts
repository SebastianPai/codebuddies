import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PremiumAccessModule } from '../../premium-access/premium-access.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { RealtimeModule } from '../../realtime/realtime.module';

@Module({
  imports: [PremiumAccessModule, NotificationsModule, RealtimeModule],
  controllers: [ItemsController],
  providers: [ItemsService, PrismaService],
  exports: [ItemsService],
})
export class ItemsModule {}
