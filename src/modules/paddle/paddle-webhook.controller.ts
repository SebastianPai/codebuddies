import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PaddleWebhookService } from './paddle-webhook.service';

@Controller('webhooks/paddle')
export class PaddleWebhookController {
  constructor(private readonly paddleWebhookService: PaddleWebhookService) {}

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

    await this.paddleWebhookService.handleEvent(req.body);

    return { received: true };
  }
}
