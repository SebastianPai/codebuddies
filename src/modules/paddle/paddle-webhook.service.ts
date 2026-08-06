import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  CertificateOrderStatus,
  PremiumSubscriptionStatus,
  SubscriptionProviderType,
} from '@prisma/client';
import { CertificateOrdersRepository } from '../payments/repositories/certificate-orders.repository';
import { PremiumSubscriptionsRepository } from '../subscriptions/repositories/premium-subscriptions.repository';
import { CertificatesService } from '../certificates/services/certificates.service';

// Todo lo que sigue está implementado contra la documentación pública de
// Paddle Billing (https://developer.paddle.com/webhooks/overview), pero sin
// poder probarlo contra un webhook real todavía (no hay credenciales de
// sandbox cargadas). Los nombres de campo del payload de cada evento están
// puestos con la mejor información disponible — conviene revalidarlos
// contra un payload real la primera vez que se pruebe end-to-end.
@Injectable()
export class PaddleWebhookService {
  private readonly logger = new Logger(PaddleWebhookService.name);

  constructor(
    private readonly certificateOrdersRepository: CertificateOrdersRepository,
    private readonly premiumSubscriptionsRepository: PremiumSubscriptionsRepository,
    private readonly certificatesService: CertificatesService,
  ) {}

  // Formato del header: "ts=<unix_seconds>;h1=<hmac_sha256_hex>". El HMAC
  // firma el string "<ts>:<raw_body>" con el webhook secret. Se compara con
  // timingSafeEqual para no filtrar el secreto por timing attack.
  verifySignature(rawBody: Buffer, signatureHeader: string | undefined): void {
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Webhook de Paddle no configurado');
    }
    if (!signatureHeader) {
      throw new UnauthorizedException('Falta la firma del webhook');
    }

    const parts = Object.fromEntries(
      signatureHeader.split(';').map((part) => part.split('=') as [string, string]),
    );
    const timestamp = parts.ts;
    const receivedHash = parts.h1;

    if (!timestamp || !receivedHash) {
      throw new UnauthorizedException('Firma de webhook con formato inválido');
    }

    const signedPayload = `${timestamp}:${rawBody.toString('utf8')}`;
    const expectedHash = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    const expected = Buffer.from(expectedHash, 'utf8');
    const received = Buffer.from(receivedHash, 'utf8');

    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException('Firma de webhook inválida');
    }
  }

  async handleEvent(event: { event_type: string; data: any }): Promise<void> {
    this.logger.log(`Evento de Paddle recibido: ${event.event_type}`);

    switch (event.event_type) {
      case 'transaction.completed':
        await this.handleTransactionCompleted(event.data);
        break;
      case 'subscription.created':
      case 'subscription.activated':
      case 'subscription.updated':
        await this.handleSubscriptionUpserted(event.data);
        break;
      case 'subscription.canceled':
        await this.handleSubscriptionCanceled(event.data);
        break;
      default:
        this.logger.debug(`Evento de Paddle ignorado: ${event.event_type}`);
    }
  }

  private async handleTransactionCompleted(data: any): Promise<void> {
    const kind = data?.custom_data?.kind;

    if (kind === 'certificate_order') {
      const orderId = data?.custom_data?.orderId as string | undefined;
      if (!orderId) {
        this.logger.warn('transaction.completed de certificado sin orderId en custom_data');
        return;
      }

      const order = await this.certificateOrdersRepository.findById(orderId);
      if (!order) {
        this.logger.warn(`CertificateOrder ${orderId} no encontrado para transacción ${data?.id}`);
        return;
      }
      if (order.status === CertificateOrderStatus.PAID) return; // idempotencia

      await this.certificateOrdersRepository.markPaid(orderId, data?.id ?? null);

      // Autoemitir el certificado apenas se confirma el pago — evita que el
      // usuario tenga que volver a la página y hacer clic en "emitir".
      try {
        await this.certificatesService.issueCertificate(order.userId, order.courseId);
      } catch (error) {
        this.logger.error(
          `No se pudo autoemitir el certificado para la orden ${orderId} tras el pago`,
          error instanceof Error ? error.stack : undefined,
        );
      }
      return;
    }

    if (kind === 'premium_subscription' && data?.subscription_id) {
      // El pago inicial de una suscripción también dispara
      // subscription.created con el mismo custom_data, que es lo que
      // realmente crea/actualiza el registro — acá no hace falta duplicar
      // esa lógica, solo lo dejamos loggeado por trazabilidad.
      this.logger.debug(
        `Transacción de suscripción premium completada: ${data.id} (subscription ${data.subscription_id})`,
      );
    }
  }

  private async handleSubscriptionUpserted(data: any): Promise<void> {
    const providerSubscriptionId = data?.id as string | undefined;
    const userId = data?.custom_data?.userId as string | undefined;
    if (!providerSubscriptionId) return;

    const status = this.mapSubscriptionStatus(data?.status);
    const expiresAt = this.resolveExpiresAt(data);

    const existing = await this.premiumSubscriptionsRepository.findByProviderSubscriptionId(
      providerSubscriptionId,
    );

    if (existing) {
      await this.premiumSubscriptionsRepository.updateStatus(existing.id, {
        status,
        expiresAt,
      });
      return;
    }

    if (!userId) {
      this.logger.warn(
        `Suscripción de Paddle ${providerSubscriptionId} sin userId en custom_data — no se puede crear`,
      );
      return;
    }

    await this.premiumSubscriptionsRepository.create({
      userId,
      provider: SubscriptionProviderType.PADDLE,
      providerSubscriptionId,
      status,
      expiresAt,
    });
  }

  private async handleSubscriptionCanceled(data: any): Promise<void> {
    const providerSubscriptionId = data?.id as string | undefined;
    if (!providerSubscriptionId) return;

    const existing = await this.premiumSubscriptionsRepository.findByProviderSubscriptionId(
      providerSubscriptionId,
    );
    if (!existing) return;

    await this.premiumSubscriptionsRepository.updateStatus(existing.id, {
      status: PremiumSubscriptionStatus.CANCELLED,
    });
  }

  private mapSubscriptionStatus(paddleStatus: unknown): PremiumSubscriptionStatus {
    switch (paddleStatus) {
      case 'active':
      case 'trialing':
        return PremiumSubscriptionStatus.ACTIVE;
      case 'canceled':
        return PremiumSubscriptionStatus.CANCELLED;
      case 'past_due':
      case 'paused':
      default:
        // Conservador: cualquier estado no explícitamente activo se trata
        // como no-activo en vez de asumir que sigue dando acceso premium.
        return PremiumSubscriptionStatus.EXPIRED;
    }
  }

  private resolveExpiresAt(data: any): Date {
    const candidate =
      data?.next_billed_at ??
      data?.current_billing_period?.ends_at ??
      null;

    if (candidate) {
      const parsed = new Date(candidate as string);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    // Fallback defensivo si Paddle no manda una fecha reconocible: 30 días
    // desde ahora, para no dejar el campo requerido sin valor.
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return fallback;
  }
}
