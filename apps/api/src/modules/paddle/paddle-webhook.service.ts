import { Injectable, Logger } from '@nestjs/common';
import { EventName } from '@paddle/paddle-node-sdk';
import type {
  EventEntity,
  CustomerNotification,
  SubscriptionCreatedNotification,
  SubscriptionNotification,
  TransactionNotification,
} from '@paddle/paddle-node-sdk';
import {
  CertificateOrderStatus,
  PremiumOrigin,
  PremiumSubscriptionStatus,
  SubscriptionProviderType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificateOrdersRepository } from '../payments/repositories/certificate-orders.repository';
import { PremiumSubscriptionsRepository } from '../subscriptions/repositories/premium-subscriptions.repository';
import { CertificatesService } from '../certificates/services/certificates.service';
import { CoinPurchasesService } from '../coins/services/coin-purchases.service';
import { EmailService } from '../email/email.service';

type AnySubscriptionNotification =
  | SubscriptionCreatedNotification
  | SubscriptionNotification;

@Injectable()
export class PaddleWebhookService {
  private readonly logger = new Logger(PaddleWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly certificateOrdersRepository: CertificateOrdersRepository,
    private readonly premiumSubscriptionsRepository: PremiumSubscriptionsRepository,
    private readonly certificatesService: CertificatesService,
    private readonly coinPurchasesService: CoinPurchasesService,
    private readonly emailService: EmailService,
  ) {}

  // event ya viene verificado y tipado (paddle.webhooks.unmarshal(), ver
  // PaddleWebhookController) o reconstruido desde un payload guardado
  // (Webhooks.fromJson(), ver PaddleWebhookAdminController) -- acá nunca se
  // vuelve a tocar la firma, solo se rutea por tipo. Eventos fuera de esta
  // lista se ignoran de forma segura (default del switch).
  async handleEvent(event: EventEntity): Promise<void> {
    this.logger.log(`Evento de Paddle recibido: ${event.eventType}`);

    switch (event.eventType) {
      case EventName.CustomerCreated:
      case EventName.CustomerUpdated:
        await this.handleCustomerUpserted(event.data);
        return;
      case EventName.SubscriptionCreated:
        await this.handleSubscriptionUpserted(event.data);
        return;
      case EventName.SubscriptionUpdated:
        await this.handleSubscriptionUpserted(event.data);
        return;
      case EventName.SubscriptionCanceled:
        await this.handleSubscriptionCanceled(event.data);
        return;
      case EventName.TransactionCompleted:
        await this.handleTransactionCompleted(event.data);
        return;
      default:
        this.logger.debug(`Evento de Paddle ignorado: ${event.eventType}`);
    }
  }

  // Vincula User.paddleCustomerId por email -- best-effort (no autoritativo
  // como el custom_data.userId de transaction.completed/subscription.*,
  // ver linkPaddleCustomer). Nunca pisa un customer id ya asignado a otro
  // valor: si dos emails distintos terminan apuntando al mismo usuario por
  // error de datos, gana el primero en llegar.
  private async handleCustomerUpserted(
    data: CustomerNotification,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: data.email, mode: 'insensitive' } },
      select: { id: true, paddleCustomerId: true },
    });

    if (!user) {
      this.logger.debug(
        `customer.* de Paddle sin usuario con email ${data.email}`,
      );
      return;
    }
    if (user.paddleCustomerId === data.id) return; // idempotencia

    await this.prisma.user.update({
      where: { id: user.id },
      data: { paddleCustomerId: data.id },
    });
  }

  // Autoritativo: custom_data.userId lo pusimos nosotros al crear la
  // transacción (ver PaddleClientService.createTransaction desde los
  // checkout providers), así que es la fuente confiable para vincular
  // Paddle customer_id <-> User -- a diferencia del match por email de
  // handleCustomerUpserted, que es solo best-effort.
  private async linkPaddleCustomer(
    userId: string,
    paddleCustomerId: string | null | undefined,
  ) {
    if (!userId || !paddleCustomerId) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { paddleCustomerId: true },
    });
    if (!user || user.paddleCustomerId === paddleCustomerId) return;

    await this.prisma.user.update({
      where: { id: userId },
      data: { paddleCustomerId },
    });
  }

  private async handleTransactionCompleted(
    data: TransactionNotification,
  ): Promise<void> {
    const kind = data.customData?.kind as string | undefined;
    const userId = data.customData?.userId as string | undefined;

    if (userId) await this.linkPaddleCustomer(userId, data.customerId);

    if (kind === 'certificate_order') {
      const orderId = data.customData?.orderId as string | undefined;
      if (!orderId) {
        this.logger.warn(
          'transaction.completed de certificado sin orderId en custom_data',
        );
        return;
      }

      const order = await this.certificateOrdersRepository.findById(orderId);
      if (!order) {
        this.logger.warn(
          `CertificateOrder ${orderId} no encontrado para transacción ${data.id}`,
        );
        return;
      }
      if (order.status === CertificateOrderStatus.PAID) return; // idempotencia

      await this.certificateOrdersRepository.markPaid(orderId, data.id ?? null);

      // Autoemitir el certificado apenas se confirma el pago (preserva la
      // lógica de verificationCode/verificationUrl existente en
      // CertificatesService.issueCertificate, que ya es idempotente por sí
      // sola si se llegara a invocar dos veces).
      try {
        await this.certificatesService.issueCertificate(
          order.userId,
          order.courseId,
        );
      } catch (error) {
        this.logger.error(
          `No se pudo autoemitir el certificado para la orden ${orderId} tras el pago`,
          error instanceof Error ? error.stack : undefined,
        );
      }
      return;
    }

    if (kind === 'premium_subscription' && data.subscriptionId) {
      // El pago inicial de una suscripción también dispara
      // subscription.created con el mismo custom_data, que es lo que
      // realmente crea/actualiza el registro — acá no hace falta duplicar
      // esa lógica, solo lo dejamos loggeado por trazabilidad.
      this.logger.debug(
        `Transacción de suscripción premium completada: ${data.id} (subscription ${data.subscriptionId})`,
      );
      return;
    }

    if (kind === 'coin_purchase') {
      const purchaseId = data.customData?.orderId as string | undefined;
      if (!purchaseId) {
        this.logger.warn(
          'transaction.completed de coins sin orderId en custom_data',
        );
        return;
      }
      // completePurchase es idempotente (compare-and-swap sobre status), así
      // que no hace falta chequear acá si ya se procesó -- el propio
      // WebhookEvent (provider+eventId único) ya filtra reintentos del mismo
      // delivery, y esto además protege contra cualquier otro camino que
      // termine llamándolo dos veces para la misma compra.
      await this.coinPurchasesService.completePurchase(
        purchaseId,
        data.id ?? null,
      );
      return;
    }
  }

  private async handleSubscriptionUpserted(
    data: AnySubscriptionNotification,
  ): Promise<void> {
    const providerSubscriptionId = data.id;
    const userId = data.customData?.userId as string | undefined;
    if (!providerSubscriptionId) return;

    const status = this.mapSubscriptionStatus(data.status);
    const expiresAt = this.resolveExpiresAt(data);
    const item = data.items[0];

    const mirrorFields = {
      paddleCustomerId: data.customerId ?? null,
      paddleProductId: item?.product?.id ?? null,
      paddlePriceId: item?.price?.id ?? null,
      paddleStatus: data.status,
      scheduledChangeAction: data.scheduledChange?.action ?? null,
      scheduledChangeEffectiveAt: data.scheduledChange?.effectiveAt
        ? new Date(data.scheduledChange.effectiveAt)
        : null,
      nextBilledAt: data.nextBilledAt ? new Date(data.nextBilledAt) : null,
      trialEndsAt: item?.trialDates?.endsAt
        ? new Date(item.trialDates.endsAt)
        : null,
    };

    if (userId) await this.linkPaddleCustomer(userId, data.customerId);

    const existing =
      await this.premiumSubscriptionsRepository.findByProviderSubscriptionId(
        providerSubscriptionId,
      );

    if (existing) {
      await this.premiumSubscriptionsRepository.updateStatus(existing.id, {
        status,
        expiresAt,
        ...mirrorFields,
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
      origin: PremiumOrigin.PAYMENT,
      ...mirrorFields,
    });

    // Solo en la creación (primera vez que este providerSubscriptionId
    // aparece) -- una renovación reentra por la rama `existing` de arriba y
    // no debe volver a avisar "ya sos premium".
    if (status === PremiumSubscriptionStatus.ACTIVE) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, username: true },
      });
      if (user) {
        this.emailService
          .sendPremiumActivatedEmail(user)
          .catch((err) =>
            this.logger.error(
              `No se pudo enviar el correo de premium activado a ${user.email}: ${err instanceof Error ? err.message : err}`,
            ),
          );
      }
    }
  }

  private async handleSubscriptionCanceled(
    data: AnySubscriptionNotification,
  ): Promise<void> {
    const providerSubscriptionId = data.id;
    if (!providerSubscriptionId) return;

    const existing =
      await this.premiumSubscriptionsRepository.findByProviderSubscriptionId(
        providerSubscriptionId,
      );
    if (!existing) return;

    await this.premiumSubscriptionsRepository.updateStatus(existing.id, {
      status: PremiumSubscriptionStatus.CANCELLED,
      paddleStatus: data.status,
      scheduledChangeAction: data.scheduledChange?.action ?? null,
      scheduledChangeEffectiveAt: data.scheduledChange?.effectiveAt
        ? new Date(data.scheduledChange.effectiveAt)
        : null,
    });
  }

  // Grant premium solo en 'active'/'trialing' -- todo lo demás (incluido
  // 'past_due'/'paused') se trata como no-activo. Una cancelación
  // PROGRAMADA (scheduledChange.action === 'cancel') NO cambia `status`
  // (sigue 'active' hasta que Paddle realmente la cancela al final del
  // período, momento en que llega subscription.canceled) -- por eso este
  // mapeo nunca necesita mirar scheduledChange para decidir acceso.
  private mapSubscriptionStatus(
    paddleStatus: string,
  ): PremiumSubscriptionStatus {
    switch (paddleStatus) {
      case 'active':
      case 'trialing':
        return PremiumSubscriptionStatus.ACTIVE;
      case 'canceled':
        return PremiumSubscriptionStatus.CANCELLED;
      case 'past_due':
      case 'paused':
      default:
        return PremiumSubscriptionStatus.EXPIRED;
    }
  }

  private resolveExpiresAt(data: AnySubscriptionNotification): Date {
    const candidate =
      data.nextBilledAt ?? data.currentBillingPeriod?.endsAt ?? null;

    if (candidate) {
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    // Fallback defensivo si Paddle no manda una fecha reconocible: 30 días
    // desde ahora, para no dejar el campo requerido sin valor.
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return fallback;
  }
}
