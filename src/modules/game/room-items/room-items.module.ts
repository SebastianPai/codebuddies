import { Module } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

import { RoomItemsService } from './room-items.service';

@Module({
  controllers: [],
  providers: [RoomItemsService, PrismaService],
  exports: [RoomItemsService],
})
export class RoomItemsModule {}
