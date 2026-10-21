import { Module } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

import { RoomItemsService } from './room-items.service';
import { PremiumAccessModule } from '../../premium-access/premium-access.module';

@Module({
  imports: [PremiumAccessModule],
  controllers: [],
  providers: [RoomItemsService, PrismaService],
  exports: [RoomItemsService],
})
export class RoomItemsModule {}
