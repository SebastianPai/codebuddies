import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppSimulationService } from './app-simulation.service';

@Injectable()
export class AppTickService {
  private readonly logger = new Logger(AppTickService.name);

  constructor(private readonly simulation: AppSimulationService) {}

  // 🔁 cada 5 segundos
  @Cron('*/10 * * * * *')
  async handleTick() {
    this.logger.debug('⏱️ Running app simulation tick...');
    await this.simulation.runTick();
  }
}
