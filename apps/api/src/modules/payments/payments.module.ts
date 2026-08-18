import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaddleClientModule } from '../paddle/paddle-client.module';
import { PaymentsController } from './controllers/payments.controller';
import { AdminPaymentsController } from './controllers/admin-payments.controller';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PaddlePaymentProvider } from './providers/paddle-payment.provider';
import { CertificateOrdersRepository } from './repositories/certificate-orders.repository';
import { PaymentsService } from './services/payments.service';
import { PAYMENT_PROVIDER } from './types/payment-provider.types';

@Module({
  imports: [PrismaModule, PaddleClientModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [
    PaymentsService,
    CertificateOrdersRepository,
    MockPaymentProvider,
    PaddlePaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      // Sin PADDLE_API_KEY configurada, sigue usando el mock tal cual
      // funcionaba antes — no hace falta tocar código cuando lleguen las
      // credenciales reales, alcanza con cargarlas en el .env y reiniciar.
      useFactory: (mock: MockPaymentProvider, paddle: PaddlePaymentProvider) =>
        process.env.PADDLE_API_KEY ? paddle : mock,
      inject: [MockPaymentProvider, PaddlePaymentProvider],
    },
  ],
  exports: [PaymentsService, CertificateOrdersRepository, PAYMENT_PROVIDER],
})
export class PaymentsModule {}
