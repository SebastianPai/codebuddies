import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { BackgroundsModule } from '../backgrounds/backgrounds.module';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [BackgroundsModule, NotificationsModule],
  providers: [RoomsService, PrismaService],
  exports: [RoomsService],
})
export class RoomsModule {}
