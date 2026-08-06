import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { CourseRecommendationsService } from './course-recommendations.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PremiumAccessModule } from '../premium-access/premium-access.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [PrismaModule, PremiumAccessModule, AdminModule],
  providers: [CourseService, CourseRecommendationsService],
  controllers: [CourseController],
})
export class CourseModule {}
