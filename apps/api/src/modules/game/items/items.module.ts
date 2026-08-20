import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PremiumAccessModule } from '../../premium-access/premium-access.module';

@Module({
  imports: [PremiumAccessModule],
  controllers: [ItemsController],
  providers: [ItemsService, PrismaService],
})
export class ItemsModule {}
