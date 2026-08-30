import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NpcService } from './npc.service';
import { NpcAdminController, NpcPublicController } from './npc.controller';

@Module({
  imports: [PrismaModule],
  controllers: [NpcPublicController, NpcAdminController],
  providers: [NpcService],
  exports: [NpcService],
})
export class NpcModule {}
