import { Module } from '@nestjs/common';
import { LayoutsService } from './layouts.service';
import { LayoutsController } from './layouts.controller';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  controllers: [LayoutsController],
  providers: [LayoutsService, PrismaService],
  exports: [LayoutsService], // 👈 importante si lo usas en otros módulos
})
export class LayoutsModule {}
