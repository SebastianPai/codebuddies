import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CertificateLookup } from '../types/certificate-query.types';

@Injectable()
export class CertificatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CertificateUncheckedCreateInput) {
    return this.prisma.certificate.create({ data });
  }

  findByUserCourse(where: CertificateLookup) {
    return this.prisma.certificate.findUnique({
      where: {
        userId_courseId: where,
      },
    });
  }

  findByVerificationCode(verificationCode: string) {
    return this.prisma.certificate.findFirst({
      where: {
        OR: [{ verificationCode }, { id: verificationCode }],
      },
      include: {
        academy: true,
        course: { include: { translations: { include: { language: true } } } },
        user: { select: { id: true, username: true, email: true } },
      },
    });
  }

  findManyByUser(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      include: {
        academy: true,
        course: { include: { translations: { include: { language: true } } } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findAllPaginated(page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.certificate.findMany({
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          course: { include: { translations: { include: { language: true }, take: 3 } } },
          academy: true,
        },
      }),
      this.prisma.certificate.count(),
    ]);
    return { items, total };
  }

  findById(id: string) {
    return this.prisma.certificate.findUnique({ where: { id } });
  }

  revoke(id: string, reason: string | undefined) {
    return this.prisma.certificate.update({
      where: { id },
      data: { revoked: true, revokedAt: new Date(), revokedReason: reason ?? null },
    });
  }

  restore(id: string) {
    return this.prisma.certificate.update({
      where: { id },
      data: { revoked: false, revokedAt: null, revokedReason: null },
    });
  }
}
