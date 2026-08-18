import { Injectable } from '@nestjs/common';
import {
  PremiumOrigin,
  PremiumSubscriptionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { paginate } from '../../../common/dto/pagination.dto';

@Injectable()
export class PremiumSubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForAdmin(
    page = 1,
    limit = 20,
    filters: {
      status?: PremiumSubscriptionStatus;
      origin?: PremiumOrigin;
      expiringSoon?: boolean;
    } = {},
  ) {
    const where: Prisma.PremiumSubscriptionWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.origin ? { origin: filters.origin } : {}),
      ...(filters.expiringSoon
        ? {
            status: PremiumSubscriptionStatus.ACTIVE,
            expiresAt: {
              gt: new Date(),
              lt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.premiumSubscription.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { startedAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
        },
      }),
      this.prisma.premiumSubscription.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  create(data: Prisma.PremiumSubscriptionUncheckedCreateInput) {
    return this.prisma.premiumSubscription.create({ data });
  }

  findActiveByUser(userId: string) {
    return this.prisma.premiumSubscription.findFirst({
      where: {
        userId,
        status: PremiumSubscriptionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'desc' },
    });
  }

  findByProviderSubscriptionId(providerSubscriptionId: string) {
    return this.prisma.premiumSubscription.findUnique({
      where: { providerSubscriptionId },
    });
  }

  updateStatus(
    id: string,
    data: Partial<Prisma.PremiumSubscriptionUncheckedUpdateInput> & {
      status: PremiumSubscriptionStatus;
    },
  ) {
    return this.prisma.premiumSubscription.update({
      where: { id },
      data,
    });
  }
}
