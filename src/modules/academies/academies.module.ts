import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AcademiesController } from './controllers/academies.controller';
import { AcademiesRepository } from './repositories/academies.repository';
import { AcademiesService } from './services/academies.service';

@Module({
  imports: [PrismaModule],
  controllers: [AcademiesController],
  providers: [AcademiesService, AcademiesRepository],
  exports: [AcademiesService, AcademiesRepository],
})
export class AcademiesModule {}
