import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const method = req.method;
    // req.route.path es el patrón registrado (ej. "/exercises/:id"), no la
    // URL real — evita que cada id distinto genere una serie de métricas
    // nueva (cardinalidad sin límite).
    const route: string = req.route?.path ?? req.path ?? 'unknown';
    const stopTimer = this.metricsService.httpRequestDuration.startTimer({ method, route });

    return next.handle().pipe(
      tap({
        next: () => this.record(method, route, res.statusCode, stopTimer),
        error: (err) => this.record(method, route, err?.status ?? 500, stopTimer),
      }),
    );
  }

  private record(
    method: string,
    route: string,
    status: number,
    stopTimer: (labels?: Record<string, string | number>) => number,
  ) {
    const statusLabel = String(status);
    stopTimer({ status: statusLabel });
    this.metricsService.httpRequestsTotal.inc({ method, route, status: statusLabel });
  }
}
