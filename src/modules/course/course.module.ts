import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CourseService],
  controllers: [CourseController],
})
export class CourseModule {}
