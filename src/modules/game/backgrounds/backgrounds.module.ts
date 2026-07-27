import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BackgroundsController } from './backgrounds.controller';
import { BackgroundsService } from './backgrounds.service';

@Module({
  imports: [PrismaModule],
  controllers: [BackgroundsController],
  providers: [BackgroundsService],
  exports: [BackgroundsService],
})
export class BackgroundsModule {}
