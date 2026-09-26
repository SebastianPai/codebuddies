import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Socket } from 'socket.io';
import { Observable, tap } from 'rxjs';
import { EventLogService } from './event-log.service';
import { pickTargetId, sanitizeForLog } from './event-log.sanitize';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Ruido sin valor para el historial (se llaman constantemente).
const HTTP_SKIP = [
  /^\/realtime\//,
  /^\/health/,
  /^\/metrics/,
  /\/typing$/,
  /^\/battle-pass\/check-in$/,
];

// Eventos del juego que cambian algo (compras, salas, muebles, permisos).
// El movimiento y el chat quedan fuera: son constantes y el chat es
// contenido privado.
const SOCKET_EVENTS = new Set([
  'shop:item:buy',
  'shop:background:buy',
  'shop:pet:buy',
  'shop:butler:buy',
  'shop:item:gift',
  'avatar:equip',
  'updateAvatar',
  'build:favorite:add',
  'build:favorite:remove',
  'createRoom',
  'room:update',
  'room:changeBackground',
  'room:lighting:set',
  'room:rate',
  'room:invite',
  'room:invite:revoke',
  'room:invite:accept',
  'room:invite:decline',
  'room:permission:revoke',
  'room:guest:kick',
  'room:joinRequest:approve',
  'room:joinRequest:reject',
  'room:givePermission',
  'room:role:create',
  'room:role:update',
  'room:role:delete',
  'room:role:assign',
  'room:item:place',
  'room:item:move',
  'room:item:rotate',
  'room:item:remove',
  'room:surface:paint',
  'room:surface:paint-all',
  'room:items:clear',
]);

type AuthedRequest = Request & { user?: { userId?: string; username?: string; role?: string } };

// Global (APP_INTERCEPTOR): toda petición HTTP que cambia algo, de cualquier
// usuario o anónima (login, registro), con resultado y duración.
@Injectable()
export class HttpEventLogInterceptor implements NestInterceptor {
  constructor(private readonly events: EventLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!MUTATING.has(req.method)) return next.handle();
    const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
    if (HTTP_SKIP.some((re) => re.test(path))) return next.handle();

    const started = Date.now();
    const routePattern = (req.route as { path?: string } | undefined)?.path ?? path;
    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : undefined;
    const write = (success: boolean, statusCode: number, error?: string) => {
      const user = req.user;
      this.events.record({
        userId: user?.userId ?? null,
        username: user?.username ?? null,
        role: user?.role ?? null,
        source: 'HTTP',
        action: `${req.method} ${routePattern}`,
        method: req.method,
        path,
        statusCode,
        success,
        durationMs: Date.now() - started,
        ip: req.ips?.length ? req.ips[0] : req.ip,
        targetId: pickTargetId(req.params as Record<string, unknown>, body),
        metadata: sanitizeForLog({
          params: req.params,
          body,
          ...(error ? { error } : {}),
        }),
      });
    };

    return next.handle().pipe(
      tap({
        next: () => write(true, context.switchToHttp().getResponse<Response>().statusCode),
        error: (err: { status?: number; message?: string }) =>
          write(false, typeof err?.status === 'number' ? err.status : 500, err?.message?.slice(0, 200)),
      }),
    );
  }
}

// En el GameGateway: acciones del juego por socket.
@Injectable()
export class SocketEventLogInterceptor implements NestInterceptor {
  constructor(private readonly events: EventLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'ws') return next.handle();
    const ws = context.switchToWs();
    const pattern = ws.getPattern();
    if (!SOCKET_EVENTS.has(pattern)) return next.handle();

    const socket = ws.getClient<Socket>();
    const data = ws.getData<Record<string, unknown> | undefined>();
    const user = socket.data?.user as { userId?: string; username?: string } | undefined;
    const started = Date.now();
    const write = (success: boolean, error?: string) =>
      this.events.record({
        userId: user?.userId ?? null,
        username: user?.username ?? null,
        source: 'SOCKET',
        action: pattern,
        success,
        durationMs: Date.now() - started,
        ip: socket.handshake?.address ?? null,
        targetId: pickTargetId(undefined, data && typeof data === 'object' ? data : undefined),
        metadata: sanitizeForLog({ data, ...(error ? { error } : {}) }),
      });

    return next.handle().pipe(
      tap({
        next: () => write(true),
        error: (err: { message?: string }) => write(false, err?.message?.slice(0, 200)),
      }),
    );
  }
}
