import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CertificateOrderStatus, Currency } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CertificateOrdersRepository } from '../repositories/certificate-orders.repository';
import { PAYMENT_PROVIDER } from '../types/payment-provider.types';
import type { PaymentProvider } from '../types/payment-provider.types';
import { PurchaseCertificateDto } from '../dto/purchase-certificate.dto';

// Precio plano para comprar el certificado de UN curso individual — el
// contenido de los cursos es gratis, esto es lo único que se cobra fuera de
// Premium (que da certificados de todos los cursos por $9.99/mes en vez de
// pagar cada uno por separado). Configurable por env sin tocar código.
const DEFAULT_CERTIFICATE_PRICE_USD = 4.99;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
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

  // Punto de entrada real del flujo de compra: crea (o reutiliza) la orden
  // y arranca un checkout para ella. El precio se define server-side, nunca
  // se acepta del cliente (evita manipulación del monto a cobrar).
  async purchaseCertificate(userId: string, dto: PurchaseCertificateDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    const existing = await this.certificateOrdersRepository.findByUserCourse(
      userId,
      dto.courseId,
    );

    if (existing?.status === CertificateOrderStatus.PAID) {
      return { alreadyPurchased: true, order: existing };
    }

    const order =
      existing ??
      (await this.certificateOrdersRepository.create({
        userId,
        courseId: dto.courseId,
        academyId: dto.academyId,
        amount: Number(
          process.env.CERTIFICATE_PRICE_USD ?? DEFAULT_CERTIFICATE_PRICE_USD,
        ),
        currency: Currency.USD,
        status: CertificateOrderStatus.PENDING,
      }));

    const checkout = await this.createCheckoutForOrder(order.id);
    return {
      alreadyPurchased: false,
      order: { ...order, providerPaymentId: checkout.providerPaymentId },
      checkout,
    };
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
