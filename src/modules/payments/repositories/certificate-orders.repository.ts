import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CertificateOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CertificateOrderUncheckedCreateInput) {
    return this.prisma.certificateOrder.create({ data });
  }

  findById(id: string) {
    return this.prisma.certificateOrder.findUnique({
      where: { id },
      include: {
        academy: true,
        course: { include: { translations: { include: { language: true } } } },
      },
    });
  }

  findByUserCourse(userId: string, courseId: string) {
    return this.prisma.certificateOrder.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
  }

  updateProviderPayment(id: string, providerPaymentId: string) {
    return this.prisma.certificateOrder.update({
      where: { id },
      data: { providerPaymentId },
    });
  }
}
