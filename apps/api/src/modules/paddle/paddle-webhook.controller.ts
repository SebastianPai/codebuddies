import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { PaymentProviderType } from '@prisma/client';
import { PaddleSdkService } from './paddle-sdk.service';
import { PaddleWebhookService } from './paddle-webhook.service';
import { WebhookEventsService } from '../webhooks/webhook-events.service';

@Controller('webhooks/paddle')
export class PaddleWebhookController {
  constructor(
    private readonly paddleSdk: PaddleSdkService,
    private readonly paddleWebhookService: PaddleWebhookService,
    private readonly webhookEventsService: WebhookEventsService,
  ) {}

  // Sin guard de auth (Paddle no manda un JWT nuestro) — la autenticación
  // acá es paddle.webhooks.unmarshal(), que verifica la firma HMAC contra
  // PADDLE_WEBHOOK_SECRET (nunca la API key) y devuelve el evento ya
  // tipado. Nada de JSON.parse(req.body) antes de esto: se firma el body
  // CRUDO, re-serializar el JSON parseado no garantiza los mismos bytes.
  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('paddle-signature') signature: string | undefined,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? '';

    let event;
    try {
      event = await this.paddleSdk.unmarshal(rawBody, signature);
    } catch {
      // No-2xx explícito: Paddle reintenta el delivery, y nunca se llega a
      // reconocer (ni loguear como recibido) un webhook con firma inválida.
      throw new UnauthorizedException('Firma de webhook de Paddle inválida');
    }

    // event_id es el id que Paddle asigna al delivery del webhook en sí (no
    // al recurso — ese es event.data.id). Es la clave de idempotencia real:
    // si Paddle reintenta la entrega (por timeout, red, etc.), llega con el
    // mismo event_id y acá se corta antes de volver a procesar nada.
    const eventId = event.eventId ?? randomUUID();

    const { alreadyProcessed, webhookEventId } =
      await this.webhookEventsService.recordReceived({
        provider: PaymentProviderType.PADDLE,
        eventId,
        eventType: event.eventType,
        payload: JSON.parse(rawBody),
      });

    if (alreadyProcessed) {
      return { received: true, duplicate: true };
    }

    try {
      await this.paddleWebhookService.handleEvent(event);
      await this.webhookEventsService.markProcessed(webhookEventId);
    } catch (error) {
      await this.webhookEventsService.markFailed(webhookEventId, error);
      throw error;
    }

    return { received: true };
  }
}
