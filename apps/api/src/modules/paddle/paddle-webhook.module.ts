import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { PaddleWebhookController } from './paddle-webhook.controller';
import { PaddleWebhookService } from './paddle-webhook.service';

@Module({
  // Depende de Payments/Subscriptions (por sus repositorios exportados) y
  // de Certificates (para autoemitir al confirmar el pago) — nunca al
  // revés, así se evita un ciclo de módulos con PaddleClientModule (que sí
  // importan Payments/Subscriptions para armar el checkout).
  imports: [PaymentsModule, SubscriptionsModule, CertificatesModule],
  controllers: [PaddleWebhookController],
  providers: [PaddleWebhookService],
})
export class PaddleWebhookModule {}
