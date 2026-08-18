import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import type { EventEntity } from '@paddle/paddle-node-sdk';

// SDK oficial de Paddle, separado a propósito del PaddleClientService "a
// mano" que ya existe (fetch directo contra /transactions) -- ese sigue
// intacto porque ya funciona y lo usan los 3 checkout providers. Este
// servicio solo cubre lo que el cliente a mano NO implementa:
// verificación/parseo de webhooks (paddle.webhooks) y sesiones del Customer
// Portal (paddle.customerPortalSessions).
@Injectable()
export class PaddleSdkService {
  private client: Paddle | null = null;

  private getClient(): Paddle {
    if (this.client) return this.client;

    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'PADDLE_API_KEY no está configurada',
      );
    }

    const environment =
      process.env.PADDLE_ENVIRONMENT === 'production'
        ? Environment.production
        : Environment.sandbox;

    this.client = new Paddle(apiKey, { environment });
    return this.client;
  }

  isConfigured(): boolean {
    return !!process.env.PADDLE_API_KEY && !!process.env.PADDLE_WEBHOOK_SECRET;
  }

  // Verifica la firma HMAC contra el webhook secret y devuelve el evento ya
  // parseado y tipado -- si la firma no matchea o el secret no está
  // configurado, tira (el controller debe responder no-2xx sin reconocer el
  // evento, nunca silenciar el error acá).
  async unmarshal(
    rawBody: string,
    signature: string | undefined,
  ): Promise<EventEntity> {
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) {
      throw new InternalServerErrorException(
        'PADDLE_WEBHOOK_SECRET no está configurada',
      );
    }
    if (!signature) {
      throw new InternalServerErrorException('Falta la firma del webhook');
    }

    return this.getClient().webhooks.unmarshal(rawBody, secret, signature);
  }

  // Sesión del Customer Portal para que el usuario administre su
  // suscripción (medios de pago, facturas, cancelación) sin que nuestro
  // backend tenga que reimplementar nada de eso.
  async createCustomerPortalSession(
    paddleCustomerId: string,
    subscriptionIds: string[] = [],
  ) {
    const session = await this.getClient().customerPortalSessions.create(
      paddleCustomerId,
      subscriptionIds,
    );
    return session.urls.general.overview;
  }
}
