import { Module } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // 🔥 IMPORTAMOS EL MODULO
  providers: [LessonService],
  controllers: [LessonController],
})
export class LessonModule {}
