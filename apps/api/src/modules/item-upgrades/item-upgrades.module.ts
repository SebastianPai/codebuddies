import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ItemUpgradesController } from './item-upgrades.controller';
import { ItemUpgradesService } from './item-upgrades.service';

@Module({
  imports: [PrismaModule],
  controllers: [ItemUpgradesController],
  providers: [ItemUpgradesService],
  exports: [ItemUpgradesService],
})
export class ItemUpgradesModule {}
