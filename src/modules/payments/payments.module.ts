import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsController } from './controllers/payments.controller';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { CertificateOrdersRepository } from './repositories/certificate-orders.repository';
import { PaymentsService } from './services/payments.service';
import { PAYMENT_PROVIDER } from './types/payment-provider.types';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    CertificateOrdersRepository,
    MockPaymentProvider,
    { provide: PAYMENT_PROVIDER, useExisting: MockPaymentProvider },
  ],
  exports: [PaymentsService, CertificateOrdersRepository, PAYMENT_PROVIDER],
})
export class PaymentsModule {}
