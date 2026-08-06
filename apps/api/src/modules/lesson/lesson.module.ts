import { Module } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PremiumAccessModule } from '../premium-access/premium-access.module';

@Module({
  imports: [PrismaModule, PremiumAccessModule],
  providers: [LessonService],
  controllers: [LessonController],
})
export class LessonModule {}
