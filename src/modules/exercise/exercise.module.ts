import { Module } from '@nestjs/common';
import { ExerciseService } from './exercise.service';
import { ExerciseController } from './exercise.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProgressModule } from '../progress/progress.module';
import { PremiumAccessModule } from '../premium-access/premium-access.module';

@Module({
  imports: [PrismaModule, ProgressModule, PremiumAccessModule],
  providers: [ExerciseService],
  controllers: [ExerciseController],
})
export class ExerciseModule {}
