import { Module } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

import { WorldItemDataController } from './world-item-data.controller';
import { WorldItemDataService } from './world-item-data.service';

@Module({
  controllers: [WorldItemDataController],
  providers: [WorldItemDataService, PrismaService],
})
export class WorldItemDataModule {}
