import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CertificateLookup } from '../types/certificate-query.types';

@Injectable()
export class CertificateAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CertificateAccessUncheckedCreateInput) {
    return this.prisma.certificateAccess.create({ data });
  }

  findByUserCourse(where: CertificateLookup) {
    return this.prisma.certificateAccess.findMany({
      where: {
        userId: where.userId,
        courseId: where.courseId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
