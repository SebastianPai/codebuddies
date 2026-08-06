import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CreateCommentDto, CreateReportDto } from './dto/content-discussion.dto';

type ContentTarget = { lessonId: string } | { exerciseId: string };

@Injectable()
export class ContentDiscussionService {
  constructor(private readonly prisma: PrismaService) {}

  async listComments(target: ContentTarget) {
    const roots = await this.prisma.contentComment.findMany({
      where: { ...target, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, username: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });
    return roots;
  }

  async createComment(userId: string, target: ContentTarget, dto: CreateCommentDto) {
    if (dto.parentId) {
      const parent = await this.prisma.contentComment.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Comentario padre no encontrado');
      // Un solo nivel de anidado (pregunta + respuestas), como Udemy — una
      // respuesta a una respuesta cuelga del mismo root, no arma un árbol.
      const rootParentId = parent.parentId ?? parent.id;
      return this.prisma.contentComment.create({
        data: { userId, ...target, parentId: rootParentId, body: dto.body },
        include: { user: { select: { id: true, username: true } } },
      });
    }

    return this.prisma.contentComment.create({
      data: { userId, ...target, body: dto.body },
      include: { user: { select: { id: true, username: true } } },
    });
  }

  async deleteComment(userId: string, isAdmin: boolean, commentId: string) {
    const comment = await this.prisma.contentComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comentario no encontrado');
    if (comment.userId !== userId && !isAdmin) {
      throw new ForbiddenException('No podés eliminar el comentario de otro usuario');
    }
    await this.prisma.contentComment.delete({ where: { id: commentId } });
    return { success: true };
  }

  createReport(userId: string, target: ContentTarget, dto: CreateReportDto) {
    return this.prisma.contentReport.create({
      data: { userId, ...target, reason: dto.reason, description: dto.description },
    });
  }

  async listReportsForAdmin(pagination: PaginationQueryDto, status?: string) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const where = status ? { status: status as any } : {};

    const [items, total] = await Promise.all([
      this.prisma.contentReport.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          lesson: { include: { translations: { take: 1 } } },
          exercise: { include: { translations: { take: 1 } } },
        },
      }),
      this.prisma.contentReport.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async resolveReport(id: string, status: 'RESOLVED' | 'DISMISSED') {
    const report = await this.prisma.contentReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    return this.prisma.contentReport.update({
      where: { id },
      data: { status, resolvedAt: new Date() },
    });
  }
}
