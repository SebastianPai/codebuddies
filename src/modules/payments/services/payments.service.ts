import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CertificateOrdersRepository } from '../repositories/certificate-orders.repository';
import { PAYMENT_PROVIDER } from '../types/payment-provider.types';
import type { PaymentProvider } from '../types/payment-provider.types';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly certificateOrdersRepository: CertificateOrdersRepository,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async getUserOrder(id: string, userId: string) {
    const order = await this.certificateOrdersRepository.findById(id);
    if (!order) throw new NotFoundException('Certificate order not found');
    if (order.userId !== userId) throw new ForbiddenException();
    return order;
  }

  async createCheckoutForOrder(orderId: string) {
    const order = await this.certificateOrdersRepository.findById(orderId);
    if (!order) throw new NotFoundException('Certificate order not found');

    const checkout = await this.paymentProvider.createCheckout({
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      description: `Certificate order ${order.id}`,
    });

    await this.certificateOrdersRepository.updateProviderPayment(
      order.id,
      checkout.providerPaymentId,
    );

    return checkout;
  }
}
