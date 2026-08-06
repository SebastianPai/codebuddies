import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async feed() {
    const [activities, certificates, users, completions] = await Promise.all([
      this.prisma.activity.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { username: true, avatarUrl: true } } },
      }),
      this.prisma.certificate.findMany({
        take: 10,
        orderBy: { issuedAt: 'desc' },
        include: {
          user: { select: { username: true, avatarUrl: true } },
          course: { include: { translations: { take: 1 } } },
        },
      }),
      this.prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { username: true, avatarUrl: true, createdAt: true },
      }),
      this.prisma.completion.findMany({
        take: 10,
        where: { courseId: { not: null } },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { username: true, avatarUrl: true } },
          course: { include: { translations: { take: 1 } } },
        },
      }),
    ]);

    return [
      ...activities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        title: this.formatActivity(activity.type),
        user: activity.user,
        createdAt: activity.createdAt,
        metadata: activity.metadata,
      })),
      ...certificates.map((certificate) => ({
        id: certificate.id,
        type: 'CERTIFICATE_ISSUED',
        title: `Certificate issued: ${certificate.course.translations[0]?.title ?? 'Course'}`,
        user: certificate.user,
        createdAt: certificate.issuedAt,
        metadata: { certificateNumber: certificate.certificateNumber },
      })),
      ...users.map((user) => ({
        id: `user-${user.username}`,
        type: 'NEW_USER',
        title: 'New learner joined CodeBuddies',
        user,
        createdAt: user.createdAt,
        metadata: null,
      })),
      ...completions.map((completion) => ({
        id: completion.id,
        type: 'COMPLETED_COURSE',
        title: `Completed course: ${completion.course?.translations[0]?.title ?? 'Course'}`,
        user: completion.user,
        createdAt: completion.createdAt,
        metadata: { courseId: completion.courseId },
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 30);
  }

  private formatActivity(type: string) {
    return type
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
