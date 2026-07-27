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

@Injectable()
export class CertificatesService {
  constructor(
    private readonly certificatesRepository: CertificatesRepository,
    private readonly certificateEligibilityService: CertificateEligibilityService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
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
      name: certificate.user.username,
      course: this.getCourseTitle(certificate.course),
      academy: certificate.academy?.name ?? 'CodeBuddies',
      issuedAt: certificate.issuedAt,
      valid: true,
    };
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
