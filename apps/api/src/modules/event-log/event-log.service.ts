import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type EventLogInput = {
  userId?: string | null;
  username?: string | null;
  role?: string | null;
  source: 'HTTP' | 'SOCKET';
  action: string;
  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
  success: boolean;
  durationMs?: number | null;
  ip?: string | null;
  targetId?: string | null;
  metadata?: unknown;
};

export type EventLogQuery = {
  userId?: string;
  username?: string;
  action?: string;
  source?: string;
  success?: string;
  targetId?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
};

const RETENTION_DAYS = 90;

@Injectable()
export class EventLogService {
  private readonly logger = new Logger(EventLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Fuera del camino de la petición: registrar nunca puede frenar ni romper
  // la acción del usuario. Si la base falla, se pierde este registro y listo.
  record(input: EventLogInput) {
    void this.prisma.eventLog
      .create({
        data: {
          userId: input.userId ?? null,
          username: input.username ?? null,
          role: input.role ?? null,
          source: input.source,
          action: input.action.slice(0, 200),
          method: input.method ?? null,
          path: input.path?.slice(0, 300) ?? null,
          statusCode: input.statusCode ?? null,
          success: input.success,
          durationMs: input.durationMs ?? null,
          ip: input.ip ?? null,
          targetId: input.targetId ?? null,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      })
      .catch((error) => this.logger.warn(`No se pudo registrar evento: ${String(error)}`));
  }

  private where(query: EventLogQuery): Prisma.EventLogWhereInput {
    const where: Prisma.EventLogWhereInput = {};
    if (query.userId) where.userId = query.userId;
    if (query.username) where.username = { contains: query.username, mode: 'insensitive' };
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.source === 'HTTP' || query.source === 'SOCKET') where.source = query.source;
    if (query.success === 'true' || query.success === 'false') where.success = query.success === 'true';
    if (query.targetId) where.targetId = query.targetId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    return where;
  }

  async list(query: EventLogQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const where = this.where(query);
    const [items, total] = await Promise.all([
      this.prisma.eventLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.eventLog.count({ where }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  // Resumen de las últimas 24 h para la cabecera del admin.
  async summary() {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const [total, errors, users, top] = await Promise.all([
      this.prisma.eventLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.eventLog.count({ where: { createdAt: { gte: since }, success: false } }),
      this.prisma.eventLog.findMany({
        where: { createdAt: { gte: since }, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.eventLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { action: 'desc' } },
        take: 8,
      }),
    ]);
    return {
      total,
      errors,
      activeUsers: users.length,
      topActions: top.map((row) => ({ action: row.action, count: row._count._all })),
    };
  }

  // Movimientos de monedas con el usuario, para la pestaña "Monedas".
  async coinMovements(query: EventLogQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const where: Prisma.CoinTransactionWhereInput = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.username ? { user: { username: { contains: query.username, mode: 'insensitive' } } } : {}),
      ...(query.action ? { reason: { contains: query.action, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.coinTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, username: true } } },
      }),
      this.prisma.coinTransaction.count({ where }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  // Retención: 90 días, como dice la Política de privacidad para registros
  // técnicos. Todos los días a las 03:30 (hora de Colombia).
  @Cron('30 8 * * *')
  async purgeOld() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000);
    const { count } = await this.prisma.eventLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    if (count) this.logger.log(`Historial: ${count} eventos de más de ${RETENTION_DAYS} días eliminados`);
  }
}
