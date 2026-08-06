import { Module } from '@nestjs/common';
import { ItemSpritesService } from './item-sprites.service';
import { ItemSpritesController } from './item-sprites.controller';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  controllers: [ItemSpritesController],
  providers: [ItemSpritesService, PrismaService],
})
export class ItemSpritesModule {}
