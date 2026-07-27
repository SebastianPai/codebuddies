import { Module } from '@nestjs/common';
import { ExerciseService } from './exercise.service';
import { ExerciseController } from './exercise.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ExerciseService],
  controllers: [ExerciseController],
})
export class ExerciseModule {}
