import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { CoinsModule } from '../coins/coins.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AdminModule } from '../admin/admin.module';
import { PaddleWebhookController } from './paddle-webhook.controller';
import { PaddleWebhookAdminController } from './paddle-webhook-admin.controller';
import { PaddleWebhookService } from './paddle-webhook.service';

@Module({
  // Depende de Payments/Subscriptions/Coins (por sus repositorios/servicios
  // exportados), de Certificates (para autoemitir al confirmar el pago), de
  // Webhooks (log + idempotencia genérica) y de Admin (para auditar el
  // reproceso manual) — nunca al revés, así se evita un ciclo de módulos
  // con PaddleClientModule (que sí importan Payments/Subscriptions para
  // armar el checkout).
  imports: [
    PaymentsModule,
    SubscriptionsModule,
    CertificatesModule,
    CoinsModule,
    WebhooksModule,
    AdminModule,
  ],
  controllers: [PaddleWebhookController, PaddleWebhookAdminController],
  providers: [PaddleWebhookService],
})
export class PaddleWebhookModule {}
