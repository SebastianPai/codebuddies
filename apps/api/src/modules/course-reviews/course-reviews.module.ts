import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CourseReviewsController } from './course-reviews.controller';
import { CourseReviewsService } from './course-reviews.service';

@Module({
  imports: [PrismaModule],
  controllers: [CourseReviewsController],
  providers: [CourseReviewsService],
  exports: [CourseReviewsService],
})
export class CourseReviewsModule {}
