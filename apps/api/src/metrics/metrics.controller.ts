import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

// Sin guard a propósito, como es estándar para que un scraper de
// Prometheus lo consuma sin credenciales — en producción esto se
// restringe a nivel de red (no exponer el puerto/ruta públicamente), no
// con auth de aplicación.
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  getMetrics() {
    return this.metricsService.getMetrics();
  }
}
