import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type ReconciliationIssueType =
  | 'CERTIFICATE_PAID_NOT_ISSUED'
  | 'WEBHOOK_STUCK_RECEIVED'
  | 'WEBHOOK_FAILED'
  | 'COIN_PURCHASE_COMPLETED_NO_LEDGER';

export interface ReconciliationIssue {
  type: ReconciliationIssueType;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  data: Record<string, unknown>;
}

// Cada chequeo acá detecta un caso real y verificable contra el schema
// actual -- no hay métricas inventadas. Ver el pedido original, "Caso A":
// pago confirmado pero el efecto (certificado/coins) nunca se completó.
@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(): Promise<{
    issues: ReconciliationIssue[];
    summary: Record<ReconciliationIssueType, number>;
  }> {
    const [
      certificatesNotIssued,
      stuckWebhooks,
      failedWebhooks,
      coinPurchasesWithoutLedger,
    ] = await Promise.all([
      this.findCertificatesPaidNotIssued(),
      this.findStuckWebhooks(),
      this.findFailedWebhooks(),
      this.findCoinPurchasesWithoutLedger(),
    ]);

    const issues: ReconciliationIssue[] = [
      ...certificatesNotIssued,
      ...stuckWebhooks,
      ...failedWebhooks,
      ...coinPurchasesWithoutLedger,
    ];

    const summary: Record<ReconciliationIssueType, number> = {
      CERTIFICATE_PAID_NOT_ISSUED: certificatesNotIssued.length,
      WEBHOOK_STUCK_RECEIVED: stuckWebhooks.length,
      WEBHOOK_FAILED: failedWebhooks.length,
      COIN_PURCHASE_COMPLETED_NO_LEDGER: coinPurchasesWithoutLedger.length,
    };

    return { issues, summary };
  }

  // El caso exacto descrito en el pedido: "usuario paga, el provider
  // confirma el pago, pero el efecto nunca se otorgó". Para certificados
  // esto es detectable con precisión porque issueCertificate() se llama
  // dentro de un try/catch que solo loggea si falla (ver
  // PaddleWebhookService.handleTransactionCompleted) -- si eso pasó, la
  // orden queda PAID para siempre sin certificado. Esto lo saca a la luz.
  private async findCertificatesPaidNotIssued(): Promise<ReconciliationIssue[]> {
    const paidOrders = await this.prisma.certificateOrder.findMany({
      where: { status: 'PAID' },
      include: {
        user: { select: { id: true, username: true, email: true } },
        course: { select: { id: true } },
      },
    });
    if (paidOrders.length === 0) return [];

    const certificates = await this.prisma.certificate.findMany({
      where: {
        OR: paidOrders.map((o) => ({ userId: o.userId, courseId: o.courseId })),
      },
      select: { userId: true, courseId: true },
    });
    const issuedSet = new Set(certificates.map((c) => `${c.userId}:${c.courseId}`));

    return paidOrders
      .filter((order) => !issuedSet.has(`${order.userId}:${order.courseId}`))
      .map((order) => ({
        type: 'CERTIFICATE_PAID_NOT_ISSUED' as const,
        severity: 'HIGH' as const,
        description: `El pedido de certificado ${order.id} está pagado pero no se emitió el certificado`,
        data: {
          orderId: order.id,
          userId: order.user.id,
          username: order.user.username,
          email: order.user.email,
          courseId: order.course.id,
          paidAt: order.paidAt,
          providerPaymentId: order.providerPaymentId,
        },
      }));
  }

  private async findStuckWebhooks(): Promise<ReconciliationIssue[]> {
    const stale = await this.prisma.webhookEvent.findMany({
      where: {
        status: 'RECEIVED',
        receivedAt: { lt: new Date(Date.now() - 5 * 60_000) },
      },
      orderBy: { receivedAt: 'asc' },
      take: 50,
    });

    return stale.map((event) => ({
      type: 'WEBHOOK_STUCK_RECEIVED' as const,
      severity: 'HIGH' as const,
      description: `El webhook ${event.provider}/${event.eventType} (${event.eventId}) quedó en RECEIVED sin procesarse`,
      data: {
        webhookEventId: event.id,
        provider: event.provider,
        eventType: event.eventType,
        eventId: event.eventId,
        receivedAt: event.receivedAt,
      },
    }));
  }

  private async findFailedWebhooks(): Promise<ReconciliationIssue[]> {
    const failed = await this.prisma.webhookEvent.findMany({
      where: { status: 'FAILED' },
      orderBy: { receivedAt: 'desc' },
      take: 50,
    });

    return failed.map((event) => ({
      type: 'WEBHOOK_FAILED' as const,
      severity: 'MEDIUM' as const,
      description: `El webhook ${event.provider}/${event.eventType} (${event.eventId}) falló al procesarse`,
      data: {
        webhookEventId: event.id,
        provider: event.provider,
        eventType: event.eventType,
        eventId: event.eventId,
        error: event.error,
        retryCount: event.retryCount,
        receivedAt: event.receivedAt,
      },
    }));
  }

  // Defensivo: con el compare-and-swap de CoinPurchasesService.completePurchase
  // esto no debería poder pasar nunca (el crédito y la fila de ledger se
  // escriben en la misma transacción), pero lo chequeamos igual para
  // detectar cualquier fila COMPLETED que haya quedado así por una vía
  // distinta (ej. una migración de datos futura, o una intervención manual
  // directa en la base).
  private async findCoinPurchasesWithoutLedger(): Promise<ReconciliationIssue[]> {
    const completed = await this.prisma.coinPurchase.findMany({
      where: { status: 'COMPLETED' },
      include: { user: { select: { id: true, username: true, email: true } } },
    });
    if (completed.length === 0) return [];

    const reasons = completed.map((p) => `coinpurchase:${p.id}`);
    const ledgerRows = await this.prisma.coinTransaction.findMany({
      where: { reason: { in: reasons } },
      select: { reason: true },
    });
    const coveredSet = new Set(ledgerRows.map((r) => r.reason));

    return completed
      .filter((p) => !coveredSet.has(`coinpurchase:${p.id}`))
      .map((purchase) => ({
        type: 'COIN_PURCHASE_COMPLETED_NO_LEDGER' as const,
        severity: 'HIGH' as const,
        description: `La compra de coins ${purchase.id} está COMPLETED pero no tiene movimiento en el ledger`,
        data: {
          coinPurchaseId: purchase.id,
          userId: purchase.user.id,
          username: purchase.user.username,
          email: purchase.user.email,
          coins: purchase.coins,
          completedAt: purchase.completedAt,
        },
      }));
  }
}
