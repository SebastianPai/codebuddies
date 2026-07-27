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
}
