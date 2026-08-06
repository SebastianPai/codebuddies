import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CourseProjectsAdminController } from './course-projects-admin.controller';
import { CourseProjectsController } from './course-projects.controller';
import { CourseProjectsService } from './course-projects.service';

@Module({
  imports: [PrismaModule],
  controllers: [CourseProjectsController, CourseProjectsAdminController],
  providers: [CourseProjectsService],
})
export class CourseProjectsModule {}
