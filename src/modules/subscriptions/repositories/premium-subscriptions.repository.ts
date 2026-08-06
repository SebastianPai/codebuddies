import { Injectable } from '@nestjs/common';
import { PremiumSubscriptionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PremiumSubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    data: { status: PremiumSubscriptionStatus; expiresAt?: Date },
  ) {
    return this.prisma.premiumSubscription.update({
      where: { id },
      data,
    });
  }
}
