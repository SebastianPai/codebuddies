import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ReviewSubmissionDto,
  SubmitProjectDto,
  UpsertCourseProjectDto,
} from './dto/course-project.dto';

@Injectable()
export class CourseProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForCourse(courseId: string, userId?: string) {
    const project = await this.prisma.courseProject.findUnique({
      where: { courseId },
    });
    if (!project) return null;

    const mine = userId
      ? await this.prisma.courseProjectSubmission.findUnique({
          where: { projectId_userId: { projectId: project.id, userId } },
        })
      : null;

    return {
      id: project.id,
      courseId: project.courseId,
      title: project.title,
      instructions: project.instructions,
      mySubmission: mine,
    };
  }

  async upsert(courseId: string, dto: UpsertCourseProjectDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.courseProject.upsert({
      where: { courseId },
      create: { courseId, title: dto.title, instructions: dto.instructions },
      update: { title: dto.title, instructions: dto.instructions },
    });
  }

  async delete(courseId: string) {
    await this.prisma.courseProject.delete({ where: { courseId } });
    return { success: true };
  }

  async submit(courseId: string, userId: string, dto: SubmitProjectDto) {
    if (!dto.submissionUrl && !dto.submissionText) {
      throw new BadRequestException('Enviá un link o una descripción de tu entrega');
    }

    const project = await this.prisma.courseProject.findUnique({ where: { courseId } });
    if (!project) throw new NotFoundException('Este curso no tiene proyecto final');

    // Requiere haber completado el curso — un proyecto final evaluado no
    // tiene sentido antes de haber pasado por el contenido.
    const courseCompletion = await this.prisma.completion.findFirst({
      where: { userId, courseId, lessonId: null, exerciseId: null },
    });
    if (!courseCompletion) {
      throw new ForbiddenException('Completá el curso antes de entregar el proyecto final');
    }

    return this.prisma.courseProjectSubmission.upsert({
      where: { projectId_userId: { projectId: project.id, userId } },
      create: {
        projectId: project.id,
        userId,
        submissionUrl: dto.submissionUrl,
        submissionText: dto.submissionText,
        status: 'PENDING',
      },
      update: {
        submissionUrl: dto.submissionUrl,
        submissionText: dto.submissionText,
        status: 'PENDING',
        reviewNote: null,
        reviewedAt: null,
        reviewedById: null,
        submittedAt: new Date(),
      },
    });
  }

  async listSubmissionsForAdmin(courseId: string) {
    const project = await this.prisma.courseProject.findUnique({ where: { courseId } });
    if (!project) return [];

    return this.prisma.courseProjectSubmission.findMany({
      where: { projectId: project.id },
      include: { user: { select: { id: true, username: true, email: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async review(submissionId: string, reviewerId: string, dto: ReviewSubmissionDto) {
    const submission = await this.prisma.courseProjectSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    return this.prisma.courseProjectSubmission.update({
      where: { id: submissionId },
      data: {
        status: dto.status,
        reviewNote: dto.reviewNote,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
      },
    });
  }
}
