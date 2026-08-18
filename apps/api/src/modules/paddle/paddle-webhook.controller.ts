import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { PaymentProviderType } from '@prisma/client';
import { PaddleWebhookService } from './paddle-webhook.service';
import { WebhookEventsService } from '../webhooks/webhook-events.service';

@Controller('webhooks/paddle')
export class PaddleWebhookController {
  constructor(
    private readonly paddleWebhookService: PaddleWebhookService,
    private readonly webhookEventsService: WebhookEventsService,
  ) {}

  // Sin guard de auth (Paddle no manda un JWT nuestro) — la autenticación
  // acá es la verificación de firma HMAC contra PADDLE_WEBHOOK_SECRET.
  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('paddle-signature') signature: string | undefined,
  ) {
    this.paddleWebhookService.verifySignature(
      req.rawBody ?? Buffer.from(''),
      signature,
    );

    // event_id es el id que Paddle asigna al delivery del webhook en sí (no
    // al recurso — ese es data.id). Es la clave de idempotencia real: si
    // Paddle reintenta la entrega (por timeout, red, etc.), llega con el
    // mismo event_id y acá se corta antes de volver a procesar nada.
    const eventId: string = req.body?.event_id ?? randomUUID();
    const eventType: string = req.body?.event_type ?? 'unknown';

    const { alreadyProcessed, webhookEventId } =
      await this.webhookEventsService.recordReceived({
        provider: PaymentProviderType.PADDLE,
        eventId,
        eventType,
        payload: req.body,
      });

    if (alreadyProcessed) {
      return { received: true, duplicate: true };
    }

    try {
      await this.paddleWebhookService.handleEvent(req.body);
      await this.webhookEventsService.markProcessed(webhookEventId);
    } catch (error) {
      await this.webhookEventsService.markFailed(webhookEventId, error);
      throw error;
    }

    return { received: true };
  }
}
