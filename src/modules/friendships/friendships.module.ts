import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { FriendshipsController } from './friendships.controller';
import { FriendshipsService } from './friendships.service';

@Module({
  imports: [PrismaModule, NotificationsModule, RealtimeModule],
  controllers: [FriendshipsController],
  providers: [FriendshipsService],
})
export class FriendshipsModule {}
