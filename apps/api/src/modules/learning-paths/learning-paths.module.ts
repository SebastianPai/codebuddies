import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { LearningPathsAdminController } from './learning-paths-admin.controller';
import { LearningPathsController } from './learning-paths.controller';
import { LearningPathsService } from './learning-paths.service';

@Module({
  imports: [PrismaModule, AdminModule, CertificatesModule],
  controllers: [LearningPathsController, LearningPathsAdminController],
  providers: [LearningPathsService],
  exports: [LearningPathsService],
})
export class LearningPathsModule {}
