import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../admin/services/admin-audit.service';
import {
  SetPathCoursesDto,
  UpsertLearningPathDto,
} from './dto/upsert-learning-path.dto';

@Injectable()
export class LearningPathsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  private pickTranslation(
    translations: Array<{ title: string; description: string | null; language: { code: string } }>,
    lang: string,
  ) {
    return (
      translations.find((t) => t.language.code === lang) ||
      translations.find((t) => t.language.code === 'es') ||
      translations[0]
    );
  }

  private courseTitle(course: {
    translations: Array<{ title: string; language: { code: string } }>;
  }, lang: string) {
    return (
      course.translations.find((t) => t.language.code === lang)?.title ||
      course.translations.find((t) => t.language.code === 'es')?.title ||
      course.translations[0]?.title ||
      null
    );
  }

  async listPublic(lang: string) {
    const paths = await this.prisma.learningPath.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        translations: { include: { language: true } },
        courses: {
          orderBy: { order: 'asc' },
          where: { course: { status: 'PUBLISHED' } },
          include: {
            course: {
              include: { translations: { include: { language: true } } },
            },
          },
        },
      },
    });

    return paths.map((path) => {
      const translation = this.pickTranslation(path.translations, lang);
      return {
        id: path.id,
        slug: path.slug,
        imageUrl: path.imageUrl,
        title: translation?.title ?? null,
        description: translation?.description ?? null,
        courseCount: path.courses.length,
        courses: path.courses.map((entry) => ({
          id: entry.course.id,
          order: entry.order,
          title: this.courseTitle(entry.course, lang),
        })),
      };
    });
  }

  async getPublicBySlugOrId(slugOrId: string, lang: string) {
    const path = await this.prisma.learningPath.findFirst({
      where: { OR: [{ slug: slugOrId }, { id: slugOrId }], active: true },
      include: {
        translations: { include: { language: true } },
        courses: {
          orderBy: { order: 'asc' },
          where: { course: { status: 'PUBLISHED' } },
          include: {
            course: {
              include: { translations: { include: { language: true } } },
            },
          },
        },
      },
    });
    if (!path) throw new NotFoundException('Learning path not found');

    const translation = this.pickTranslation(path.translations, lang);
    return {
      id: path.id,
      slug: path.slug,
      imageUrl: path.imageUrl,
      title: translation?.title ?? null,
      description: translation?.description ?? null,
      courses: path.courses.map((entry) => ({
        id: entry.course.id,
        order: entry.order,
        title: this.courseTitle(entry.course, lang),
        difficulty: entry.course.difficulty,
      })),
    };
  }

  listAdmin() {
    return this.prisma.learningPath.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        translations: { include: { language: true } },
        _count: { select: { courses: true } },
      },
    });
  }

  async getAdminById(id: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },
        courses: {
          orderBy: { order: 'asc' },
          include: {
            course: {
              include: { translations: { include: { language: true } } },
            },
          },
        },
      },
    });
    if (!path) throw new NotFoundException('Learning path not found');
    return {
      id: path.id,
      slug: path.slug,
      imageUrl: path.imageUrl,
      active: path.active,
      sortOrder: path.sortOrder,
      translations: path.translations.map((t) => ({
        languageCode: t.language.code,
        title: t.title,
        description: t.description,
      })),
      courses: path.courses.map((entry) => ({
        id: entry.course.id,
        order: entry.order,
        title: this.courseTitle(entry.course, 'es'),
      })),
    };
  }

  create(dto: UpsertLearningPathDto) {
    return this.prisma.learningPath.create({
      data: {
        slug: dto.slug,
        imageUrl: dto.imageUrl,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
        translations: {
          create: dto.translations.map((t) => ({
            language: { connect: { code: t.languageCode } },
            title: t.title,
            description: t.description,
          })),
        },
      },
    });
  }

  async update(id: string, dto: UpsertLearningPathDto) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!path) throw new NotFoundException('Learning path not found');

    await this.prisma.learningPath.update({
      where: { id },
      data: {
        slug: dto.slug,
        imageUrl: dto.imageUrl,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    for (const t of dto.translations) {
      const language = await this.prisma.language.findUnique({
        where: { code: t.languageCode },
      });
      if (!language) continue;

      const existing = path.translations.find(
        (tr) => tr.languageId === language.id,
      );

      if (existing) {
        await this.prisma.learningPathTranslation.update({
          where: { id: existing.id },
          data: { title: t.title, description: t.description },
        });
      } else {
        await this.prisma.learningPathTranslation.create({
          data: {
            learningPathId: id,
            languageId: language.id,
            title: t.title,
            description: t.description,
          },
        });
      }
    }

    return { success: true };
  }

  async delete(id: string, adminId?: string) {
    const path = await this.prisma.learningPath.delete({ where: { id } });
    if (adminId) {
      await this.adminAuditService.logStandalone({
        adminId,
        action: 'DELETE_LEARNING_PATH',
        targetType: 'LearningPath',
        targetId: id,
        metadata: { slug: path.slug },
      });
    }
    return { success: true };
  }

  async setCourses(id: string, dto: SetPathCoursesDto) {
    const path = await this.prisma.learningPath.findUnique({ where: { id } });
    if (!path) throw new NotFoundException('Learning path not found');

    await this.prisma.$transaction([
      this.prisma.learningPathCourse.deleteMany({
        where: { learningPathId: id },
      }),
      this.prisma.learningPathCourse.createMany({
        data: dto.courseIds.map((courseId, index) => ({
          learningPathId: id,
          courseId,
          order: index + 1,
        })),
      }),
    ]);

    return { success: true };
  }
}
