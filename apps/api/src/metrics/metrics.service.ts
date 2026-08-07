import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

// BE6: no había ninguna métrica de aplicación — solo logs. Esto no
// pretende ser observabilidad completa (eso implica un backend real que
// scrapee /metrics, tracing distribuido, alertas), pero deja el endpoint
// listo para que Prometheus (o cualquier scraper compatible) lo consuma
// el día que exista esa infraestructura, sin tener que instrumentar nada
// de nuevo.
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total de requests HTTP procesados',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duración de requests HTTP en segundos',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
