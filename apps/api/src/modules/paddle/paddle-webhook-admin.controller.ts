import {
  Controller,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { PaddleWebhookService } from './paddle-webhook.service';
import { WebhookEventsRepository } from '../webhooks/webhook-events.repository';
import { WebhookEventsService } from '../webhooks/webhook-events.service';
import { AdminAuditService } from '../admin/services/admin-audit.service';

// Acción manual explícita (no automática): un admin decide reintentar un
// evento que quedó RECEIVED sin procesar o que falló, típicamente detectado
// desde /admin/reconciliation. Vuelve a correr el mismo handler con el
// payload guardado -- por eso PaddleWebhookService.handleEvent() /
// CoinPurchasesService.completePurchase() / etc. tienen que ser idempotentes
// de por sí, no porque este endpoint lo garantice.
@Controller('admin/webhook-events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PaddleWebhookAdminController {
  constructor(
    private readonly paddleWebhookService: PaddleWebhookService,
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly webhookEventsService: WebhookEventsService,
    private readonly adminAudit: AdminAuditService,
  ) {}

  @Post(':id/reprocess')
  async reprocess(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const event = await this.webhookEventsRepository.findById(id);
    if (!event) throw new NotFoundException('Webhook event not found');

    try {
      await this.paddleWebhookService.handleEvent(
        event.payload as { event_type: string; data: unknown },
      );
      await this.webhookEventsService.markProcessed(event.id);
    } catch (error) {
      await this.webhookEventsService.markFailed(event.id, error);
      await this.adminAudit.logStandalone({
        adminId: req.user.userId,
        action: 'REPROCESS_WEBHOOK_FAILED',
        targetType: 'WebhookEvent',
        targetId: event.id,
        metadata: { provider: event.provider, eventType: event.eventType },
      });
      throw error;
    }

    await this.adminAudit.logStandalone({
      adminId: req.user.userId,
      action: 'REPROCESS_WEBHOOK',
      targetType: 'WebhookEvent',
      targetId: event.id,
      metadata: { provider: event.provider, eventType: event.eventType },
    });

    return { reprocessed: true };
  }
}
