import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CourseCategoriesAdminController } from './course-categories-admin.controller';
import { CourseCategoriesController } from './course-categories.controller';
import { CourseCategoriesService } from './course-categories.service';

@Module({
  imports: [PrismaModule],
  controllers: [CourseCategoriesController, CourseCategoriesAdminController],
  providers: [CourseCategoriesService],
  exports: [CourseCategoriesService],
})
export class CourseCategoriesModule {}
