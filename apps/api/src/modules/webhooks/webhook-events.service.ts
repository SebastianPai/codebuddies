import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PaymentProviderType, WebhookEventStatus } from '@prisma/client';
import { WebhookEventsRepository } from './webhook-events.repository';

interface RecordReceivedInput {
  provider: PaymentProviderType;
  eventId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

@Injectable()
export class WebhookEventsService {
  private readonly logger = new Logger(WebhookEventsService.name);

  constructor(private readonly repository: WebhookEventsRepository) {}

  // Clave de idempotencia real: @@unique([provider, eventId]) en la tabla.
  // Un segundo delivery del mismo evento (Paddle reintenta si no recibe 2xx
  // a tiempo) choca contra esa unique constraint en vez de crear una fila
  // nueva -- ahí es donde se detecta "ya lo vimos" y se corta antes de
  // volver a ejecutar handleEvent().
  async recordReceived(
    input: RecordReceivedInput,
  ): Promise<{ alreadyProcessed: boolean; webhookEventId: string }> {
    try {
      const created = await this.repository.create({
        provider: input.provider,
        eventId: input.eventId,
        eventType: input.eventType,
        payload: input.payload,
        status: WebhookEventStatus.RECEIVED,
      });
      return { alreadyProcessed: false, webhookEventId: created.id };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.repository.findByProviderEventId(
          input.provider,
          input.eventId,
        );
        this.logger.warn(
          `Webhook duplicado ignorado: ${input.provider}/${input.eventId} (status actual: ${existing?.status})`,
        );
        return {
          alreadyProcessed: true,
          webhookEventId: existing?.id ?? '',
        };
      }
      throw error;
    }
  }

  markProcessed(webhookEventId: string) {
    if (!webhookEventId) return Promise.resolve();
    return this.repository.markProcessed(webhookEventId);
  }

  markFailed(webhookEventId: string, error: unknown) {
    if (!webhookEventId) return Promise.resolve();
    const message = error instanceof Error ? error.message : String(error);
    return this.repository.markFailed(webhookEventId, message);
  }
}
