import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BattlePassService } from './battle-pass.service';

// Cambio de temporada automático: todos los días a las 00:01 de Colombia
// (05:01 UTC) se cierra la temporada vencida y se activa/crea la del mes.
@Injectable()
export class BattlePassJobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BattlePassJobsService.name);

  constructor(private readonly battlePassService: BattlePassService) {}

  onApplicationBootstrap() {
    void this.rotate();
  }

  @Cron('1 5 * * *')
  async rotate() {
    try {
      const active = await this.battlePassService.rotateSeasons();
      if (active) this.logger.log(`Temporada activa: ${active.name}`);
    } catch (error) {
      this.logger.error(`No se pudo rotar la temporada del pase: ${String(error)}`);
    }
  }
}
