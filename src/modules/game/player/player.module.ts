import { Module } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  providers: [PlayerService, PrismaService],
  exports: [PlayerService],
})
export class PlayerModule {}
