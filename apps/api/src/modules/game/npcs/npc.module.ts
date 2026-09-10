import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NpcService } from './npc.service';
import { NpcAdminController, NpcPublicController } from './npc.controller';
import { ButlerService } from './butler.service';
import { ButlerController } from './butler.controller';

@Module({
  imports: [PrismaModule],
  controllers: [NpcPublicController, NpcAdminController, ButlerController],
  providers: [NpcService, ButlerService],
  exports: [NpcService, ButlerService],
})
export class NpcModule {}
