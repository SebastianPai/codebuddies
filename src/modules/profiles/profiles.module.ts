import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RoomsModule } from '../game/rooms/rooms.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [PrismaModule, NotificationsModule, RoomsModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
