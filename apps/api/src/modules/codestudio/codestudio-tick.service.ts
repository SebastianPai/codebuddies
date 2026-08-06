import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CodeStudioService } from './codestudio.service';

@Injectable()
export class CodeStudioTickService {
  private readonly logger = new Logger(CodeStudioTickService.name);
  private running = false;

  constructor(private readonly codeStudio: CodeStudioService) {}

  @Cron('*/10 * * * * *')
  async handleTick() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.codeStudio.runGlobalTick();
      if (result.processed > 0) {
        this.logger.debug(`CodeStudio tick procesado: ${result.processed} empresas`);
      }
    } catch (error) {
      this.logger.error('Error ejecutando tick de CodeStudio', error as Error);
    } finally {
      this.running = false;
    }
  }
}
