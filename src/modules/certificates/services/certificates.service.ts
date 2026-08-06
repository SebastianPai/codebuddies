import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, NotificationType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CertificatesRepository } from '../repositories/certificates.repository';
import { CertificateEligibilityService } from './certificate-eligibility.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { paginate } from '../../../common/dto/pagination.dto';
import { AdminAuditService } from '../../admin/services/admin-audit.service';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly certificatesRepository: CertificatesRepository,
    private readonly certificateEligibilityService: CertificateEligibilityService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  listForUser(userId: string) {
    return this.certificatesRepository.findManyByUser(userId);
  }

  async getCourseStatus(userId: string, courseId: string) {
    const status = await this.certificateEligibilityService.getStatus(
      userId,
      courseId,
    );

    return {
      completed: status.completed,
      eligible: status.eligible,
      hasCertificate: status.hasCertificate,
      accessType: status.accessType,
      certificateId: status.certificateId,
    };
  }

  async issueCertificate(userId: string, courseId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const status = await this.certificateEligibilityService.getStatus(
          userId,
          courseId,
          tx,
        );

        if (status.certificateId) {
          return tx.certificate.findUniqueOrThrow({
            where: { id: status.certificateId },
          });
        }

        if (!status.completed) {
          throw new BadRequestException('Course is not completed');
        }

        if (!status.eligible) {
          throw new ForbiddenException('Certificate access is required');
        }

        const verificationCode = randomUUID();

        const certificate = await tx.certificate.create({
          data: {
            certificateNumber: this.buildCertificateNumber(),
            userId,
            courseId,
            academyId: status.academyId,
            verificationCode,
            verificationUrl: this.buildVerificationUrl(verificationCode),
          },
        });

        await this.notificationsService.create({
          userId,
          type: NotificationType.CERTIFICATE_ISSUED,
          title: 'Certificate issued',
          body: 'Your CodeBuddies certificate is ready.',
          metadata: { certificateId: certificate.id, courseId },
        });

        await tx.activity.create({
          data: {
            userId,
            type: ActivityType.EARNED_CERTIFICATE,
            metadata: { certificateId: certificate.id, courseId },
          },
        });

        return certificate;
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        const existing = await this.certificatesRepository.findByUserCourse({
          userId,
          courseId,
        });
        if (existing) return existing;
      }

      throw error;
    }
  }

  async verifyPublicCertificate(verificationCode: string) {
    const certificate =
      await this.certificatesRepository.findByVerificationCode(
        verificationCode,
      );

    if (!certificate) throw new NotFoundException('Certificate not found');

    return {
      certificateId: certificate.id,
      certificateNumber: certificate.certificateNumber,
      verificationCode: certificate.verificationCode,
      verificationUrl: certificate.verificationUrl,
      name: certificate.user.username,
      course: this.getCourseTitle(certificate.course),
      academy: certificate.academy?.name ?? 'CodeBuddies',
      issuedAt: certificate.issuedAt,
      revoked: certificate.revoked,
      revokedAt: certificate.revokedAt,
      revokedReason: certificate.revokedReason,
      // "valid" siempre reflejó solo "existe" — ahora también depende de que
      // no haya sido revocado (NF37): el consumidor público de este endpoint
      // (verificadores externos, LinkedIn, etc.) no debería tratar un
      // certificado revocado como legítimo aunque el número exista.
      valid: !certificate.revoked,
    };
  }

  async listAllForAdmin(page = 1, limit = 20) {
    const { items, total } = await this.certificatesRepository.findAllPaginated(
      page,
      limit,
    );
    return paginate(
      items.map((certificate) => ({
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        verificationCode: certificate.verificationCode,
        issuedAt: certificate.issuedAt,
        revoked: certificate.revoked,
        revokedAt: certificate.revokedAt,
        revokedReason: certificate.revokedReason,
        user: certificate.user,
        academy: certificate.academy?.name ?? 'CodeBuddies',
        course: this.getCourseTitle(certificate.course),
      })),
      total,
      page,
      limit,
    );
  }

  async revokeCertificate(id: string, reason: string | undefined, adminId?: string) {
    const certificate = await this.certificatesRepository.findById(id);
    if (!certificate) throw new NotFoundException('Certificate not found');
    const revoked = await this.certificatesRepository.revoke(id, reason);
    if (adminId) {
      await this.adminAuditService.logStandalone({
        adminId,
        action: 'REVOKE_CERTIFICATE',
        targetUserId: certificate.userId,
        targetType: 'Certificate',
        targetId: id,
        metadata: { certificateNumber: certificate.certificateNumber, reason },
      });
    }
    return revoked;
  }

  async restoreCertificate(id: string, adminId?: string) {
    const certificate = await this.certificatesRepository.findById(id);
    if (!certificate) throw new NotFoundException('Certificate not found');
    const restored = await this.certificatesRepository.restore(id);
    if (adminId) {
      await this.adminAuditService.logStandalone({
        adminId,
        action: 'RESTORE_CERTIFICATE',
        targetUserId: certificate.userId,
        targetType: 'Certificate',
        targetId: id,
        metadata: { certificateNumber: certificate.certificateNumber },
      });
    }
    return restored;
  }

  private buildCertificateNumber() {
    const year = new Date().getFullYear();
    return `CB-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private buildVerificationUrl(verificationCode: string) {
    const baseUrl =
      process.env.CERTIFICATE_VERIFICATION_BASE_URL ??
      'https://codebuddies.app/certificates/verify';

    return `${baseUrl}/${verificationCode}`;
  }

  private getCourseTitle(course: {
    translations: Array<{ title: string; language: { code: string } }>;
  }) {
    return (
      course.translations.find(
        (translation) => translation.language.code === 'es',
      )?.title ??
      course.translations[0]?.title ??
      'Untitled course'
    );
  }
}
