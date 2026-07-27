import { Module } from '@nestjs/common';
import { AnimationsService } from './animations.service';
import { AnimationsController } from './animations.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AnimationsService],
  controllers: [AnimationsController],
})
export class AnimationsModule {}
