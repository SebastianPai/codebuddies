import { Injectable } from '@nestjs/common';
import { PremiumSubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CertificateStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminStats() {
    const now = new Date();
    const [issuedCertificates, activePremiumUsers, activeAcademies] =
      await Promise.all([
        this.prisma.certificate.count(),
        this.prisma.premiumSubscription.count({
          where: {
            status: PremiumSubscriptionStatus.ACTIVE,
            expiresAt: { gt: now },
          },
        }),
        this.prisma.academy.count({ where: { active: true } }),
      ]);

    return {
      issuedCertificates,
      activePremiumUsers,
      activeAcademies,
    };
  }
}
