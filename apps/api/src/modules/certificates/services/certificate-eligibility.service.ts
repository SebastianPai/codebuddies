import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateAccessType, CertificateOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PremiumAccessService } from '../../premium-access/premium-access.service';
import { CertificateEligibilityResult } from '../types/certificate-status.types';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CertificateEligibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly premiumAccessService: PremiumAccessService,
  ) {}

  async getStatus(
    userId: string,
    courseId: string,
    client: PrismaExecutor = this.prisma,
  ): Promise<CertificateEligibilityResult> {
    const [certificate, completed, access] = await Promise.all([
      client.certificate.findUnique({
        where: { userId_courseId: { userId, courseId } },
      }),
      this.isCourseCompleted(userId, courseId, client),
      this.resolveAccess(userId, courseId, client),
    ]);

    const hasCertificate = !!certificate;
    const eligible = hasCertificate || (completed && !!access.accessType);

    return {
      completed,
      eligible,
      hasCertificate,
      accessType: access.accessType,
      certificateId: certificate?.id ?? null,
      academyId: certificate?.academyId ?? access.academyId,
    };
  }

  // Público (BE3): reutilizado por LearningPathsService para calcular
  // bloqueo/progreso real en el mapa de rutas de aprendizaje, en vez de
  // reimplementar "¿este usuario completó este curso?" por tercera vez.
  async isCourseCompleted(
    userId: string,
    courseId: string,
    client: PrismaExecutor = this.prisma,
  ) {
    const course = await client.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        lessons: {
          select: {
            id: true,
            exercises: { select: { id: true } },
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    const explicitCourseCompletion = await client.completion.findFirst({
      where: {
        userId,
        courseId,
        lessonId: null,
        exerciseId: null,
      },
      select: { id: true },
    });

    if (explicitCourseCompletion) return true;

    const enrollment = await client.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    });

    const lessonIds = course.lessons.map((lesson) => lesson.id);
    const exerciseIds = course.lessons.flatMap((lesson) =>
      lesson.exercises.map((exercise) => exercise.id),
    );

    if (exerciseIds.length > 0) {
      const completedExercises = await client.completion.findMany({
        where: { userId, exerciseId: { in: exerciseIds } },
        select: { exerciseId: true },
      });

      const completedIds = new Set(
        completedExercises
          .map((completion) => completion.exerciseId)
          .filter(Boolean),
      );

      return (
        (!!enrollment || completedIds.size > 0) &&
        exerciseIds.every((id) => completedIds.has(id))
      );
    }

    if (lessonIds.length > 0) {
      const completedLessons = await client.completion.findMany({
        where: {
          userId,
          lessonId: { in: lessonIds },
          exerciseId: null,
        },
        select: { lessonId: true },
      });

      const completedIds = new Set(
        completedLessons
          .map((completion) => completion.lessonId)
          .filter(Boolean),
      );

      return (
        (!!enrollment || completedIds.size > 0) &&
        lessonIds.every((id) => completedIds.has(id))
      );
    }

    return false;
  }

  private async resolveAccess(
    userId: string,
    courseId: string,
    client: PrismaExecutor,
  ) {
    const directAccess = await client.certificateAccess.findFirst({
      where: {
        userId,
        courseId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (directAccess) {
      return {
        accessType: directAccess.accessType,
        academyId: directAccess.academyId,
      };
    }

    const premium = await this.premiumAccessService.hasPremiumAccess(userId, client);

    if (premium) {
      return {
        accessType: CertificateAccessType.PREMIUM,
        academyId: null,
      };
    }

    const paidOrder = await client.certificateOrder.findFirst({
      where: {
        userId,
        courseId,
        status: CertificateOrderStatus.PAID,
      },
      orderBy: { paidAt: 'desc' },
    });

    if (paidOrder) {
      return {
        accessType: CertificateAccessType.PAID,
        academyId: paidOrder.academyId,
      };
    }

    return { accessType: null, academyId: null };
  }
}
