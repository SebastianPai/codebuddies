import { Module } from '@nestjs/common';
import { AppService } from './apps.service';
import { AppController } from './app.controller';
import { AppValidationService } from './app-validation.service';
import { AppSimulationService } from './app-simulation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScheduleModule } from '@nestjs/schedule';
import { AppTickService } from './app-tick.service';

@Module({
  imports: [
    ScheduleModule.forRoot(), // 🔥 ESTO ACTIVA CRON
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppValidationService,
    AppSimulationService,
    PrismaService,
    AppTickService,
  ],
  exports: [AppService],
})
export class AppsModule {}
