import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { CoinsModule } from '../coins/coins.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AdminModule } from '../admin/admin.module';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaddleClientModule } from './paddle-client.module';
import { PaddleWebhookController } from './paddle-webhook.controller';
import { PaddleWebhookAdminController } from './paddle-webhook-admin.controller';
import { PaddleWebhookService } from './paddle-webhook.service';

@Module({
  // Depende de Payments/Subscriptions/Coins (por sus repositorios/servicios
  // exportados), de Certificates (para autoemitir al confirmar el pago), de
  // Webhooks (log + idempotencia genérica), de Admin (para auditar el
  // reproceso manual), de Email (avisar premium activado) y de
  // PaddleClientModule (para PaddleSdkService, verificación/parseo de
  // webhooks) — nunca al revés.
  imports: [
    PaymentsModule,
    SubscriptionsModule,
    CertificatesModule,
    CoinsModule,
    WebhooksModule,
    AdminModule,
    EmailModule,
    PrismaModule,
    PaddleClientModule,
  ],
  controllers: [PaddleWebhookController, PaddleWebhookAdminController],
  providers: [PaddleWebhookService],
})
export class PaddleWebhookModule {}
