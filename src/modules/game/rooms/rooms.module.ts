import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { BackgroundsModule } from '../backgrounds/backgrounds.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { FriendshipsModule } from '../../friendships/friendships.module';

@Module({
  imports: [BackgroundsModule, NotificationsModule, FriendshipsModule],
  providers: [RoomsService, PrismaService],
  exports: [RoomsService],
})
export class RoomsModule {}
