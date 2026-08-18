import { Injectable } from '@nestjs/common';
import { CertificateOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { paginate } from '../../../common/dto/pagination.dto';

@Injectable()
export class CertificateOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForAdmin(
    page = 1,
    limit = 20,
    filters: { status?: CertificateOrderStatus; userId?: string } = {},
  ) {
    const where: Prisma.CertificateOrderWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.certificateOrder.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          course: { select: { id: true } },
        },
      }),
      this.prisma.certificateOrder.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  create(data: Prisma.CertificateOrderUncheckedCreateInput) {
    return this.prisma.certificateOrder.create({ data });
  }

  markPaid(id: string, providerPaymentId: string | null) {
    return this.prisma.certificateOrder.update({
      where: { id },
      data: {
        status: CertificateOrderStatus.PAID,
        paidAt: new Date(),
        ...(providerPaymentId ? { providerPaymentId } : {}),
      },
    });
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
