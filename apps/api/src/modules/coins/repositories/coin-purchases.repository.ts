import { Injectable } from '@nestjs/common';
import { CoinPurchaseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { paginate } from '../../../common/dto/pagination.dto';

@Injectable()
export class CoinPurchasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CoinPurchaseUncheckedCreateInput) {
    return this.prisma.coinPurchase.create({ data });
  }

  findById(id: string) {
    return this.prisma.coinPurchase.findUnique({
      where: { id },
      include: { user: { select: { id: true, username: true, email: true } } },
    });
  }

  findByProviderTransactionId(providerTransactionId: string) {
    return this.prisma.coinPurchase.findUnique({
      where: { providerTransactionId },
    });
  }

  updateProviderTransactionId(id: string, providerTransactionId: string) {
    return this.prisma.coinPurchase.update({
      where: { id },
      data: { providerTransactionId },
    });
  }

  async listForAdmin(
    page = 1,
    limit = 20,
    filters: { status?: CoinPurchaseStatus; userId?: string } = {},
  ) {
    const where: Prisma.CoinPurchaseWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.coinPurchase.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, email: true } } },
      }),
      this.prisma.coinPurchase.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }
}
