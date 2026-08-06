import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { UpsertCourseReviewDto } from './dto/upsert-course-review.dto';

@Injectable()
export class CourseReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForCourse(courseId: string, pagination: PaginationQueryDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const [items, total, summary] = await Promise.all([
      this.prisma.courseReview.findMany({
        where: { courseId },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true } } },
      }),
      this.prisma.courseReview.count({ where: { courseId } }),
      this.prisma.courseReview.aggregate({
        where: { courseId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      ...paginate(items, total, page, limit),
      summary: {
        average: summary._avg.rating ?? 0,
        count: summary._count.rating,
      },
    };
  }

  getMine(userId: string, courseId: string) {
    return this.prisma.courseReview.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
  }

  async upsert(userId: string, courseId: string, dto: UpsertCourseReviewDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    // Solo quien está inscripto puede dejar reseña — evita reseñas de
    // alguien que nunca tocó el contenido del curso.
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) {
      throw new ForbiddenException('Debés estar inscripto en el curso para dejar una reseña');
    }

    return this.prisma.courseReview.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, rating: dto.rating, comment: dto.comment },
      update: { rating: dto.rating, comment: dto.comment },
    });
  }

  async remove(userId: string, courseId: string) {
    await this.prisma.courseReview.deleteMany({ where: { userId, courseId } });
    return { success: true };
  }
}
