import { Injectable } from '@nestjs/common';
import { PaymentProviderType, Prisma, WebhookEventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class WebhookEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.WebhookEventUncheckedCreateInput) {
    return this.prisma.webhookEvent.create({ data });
  }

  findByProviderEventId(provider: PaymentProviderType, eventId: string) {
    return this.prisma.webhookEvent.findUnique({
      where: { provider_eventId: { provider, eventId } },
    });
  }

  findById(id: string) {
    return this.prisma.webhookEvent.findUnique({ where: { id } });
  }

  markProcessed(id: string) {
    return this.prisma.webhookEvent.update({
      where: { id },
      data: { status: WebhookEventStatus.PROCESSED, processedAt: new Date() },
    });
  }

  markFailed(id: string, error: string) {
    return this.prisma.webhookEvent.update({
      where: { id },
      data: {
        status: WebhookEventStatus.FAILED,
        error: error.slice(0, 2000),
        retryCount: { increment: 1 },
      },
    });
  }

  async listForAdmin(
    page = 1,
    limit = 20,
    filters: { status?: WebhookEventStatus; provider?: PaymentProviderType } = {},
  ) {
    const where: Prisma.WebhookEventWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.provider ? { provider: filters.provider } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.webhookEvent.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { receivedAt: 'desc' },
      }),
      this.prisma.webhookEvent.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  // Eventos que quedaron "colgados" en RECEIVED más de `staleMinutes` — o se
  // rompió el proceso a mitad de camino, o hay un bug silencioso en el
  // handler que nunca llega a marcar PROCESSED/FAILED.
  findStale(staleMinutes = 5) {
    const threshold = new Date(Date.now() - staleMinutes * 60_000);
    return this.prisma.webhookEvent.findMany({
      where: { status: WebhookEventStatus.RECEIVED, receivedAt: { lt: threshold } },
      orderBy: { receivedAt: 'asc' },
      take: 50,
    });
  }
}
