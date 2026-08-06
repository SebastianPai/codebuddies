import { Injectable } from '@nestjs/common';
import { Difficulty } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DIFFICULTY_PROGRESSION: Record<Difficulty, Difficulty> = {
  EASY: 'MEDIUM',
  MEDIUM: 'HARD',
  HARD: 'HARD',
};

const RECOMMENDATION_LIMIT = 6;

interface CandidateCourse {
  id: string;
  moduleId: string | null;
  difficulty: Difficulty;
  imageUrl: string | null;
  translations: Array<{ title: string; description: string | null; language: { code: string } }>;
  categories: Array<{ id: string; slug: string; name: string }>;
  _count: { enrollments: number };
}

// NF5: motor de recomendaciones "cursos para ti" — v1 basado en reglas
// (no ML, tal como recomienda el propio audit), a partir de categorías y
// dificultad de lo que el usuario ya completó, más si tiene los
// prerrequisitos satisfechos. Sin historial (usuario nuevo o anónimo) cae
// a un ranking simple por popularidad (más inscripciones).
@Injectable()
export class CourseRecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(userId: string | undefined, lang: string) {
    const candidateCourses = await this.prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        translations: { include: { language: true } },
        categories: true,
        prerequisites: { select: { prerequisiteCourseId: true } },
        _count: { select: { enrollments: true } },
      },
    });

    if (!userId) {
      return this.rankByPopularity(candidateCourses, lang).slice(0, RECOMMENDATION_LIMIT);
    }

    const [enrollments, courseCompletions] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } }),
      this.prisma.completion.findMany({
        where: { userId, courseId: { not: null }, lessonId: null, exerciseId: null },
        select: { courseId: true },
      }),
    ]);

    const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
    const completedCourseIds = new Set(
      courseCompletions.map((c) => c.courseId).filter((id): id is string => Boolean(id)),
    );

    if (completedCourseIds.size === 0) {
      // Todavía sin cursos completados: no hay señal de categoría/dificultad
      // preferida, así que cae a popularidad, pero sigue ocultando lo que
      // ya está inscripto (no tiene sentido "recomendar" lo que ya empezó).
      return this.rankByPopularity(candidateCourses, lang)
        .filter((c) => !enrolledCourseIds.has(c.id))
        .slice(0, RECOMMENDATION_LIMIT);
    }

    const completedCourses = candidateCourses.filter((c) => completedCourseIds.has(c.id));
    const preferredCategoryIds = new Map<string, number>();
    const difficultyCounts = new Map<Difficulty, number>();

    for (const course of completedCourses) {
      for (const category of course.categories) {
        preferredCategoryIds.set(category.id, (preferredCategoryIds.get(category.id) ?? 0) + 1);
      }
      difficultyCounts.set(course.difficulty, (difficultyCounts.get(course.difficulty) ?? 0) + 1);
    }

    const dominantDifficulty = [...difficultyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'EASY';
    const nextDifficulty = DIFFICULTY_PROGRESSION[dominantDifficulty];

    const inProgressModuleIds = new Set(
      candidateCourses
        .filter((c) => enrolledCourseIds.has(c.id) && !completedCourseIds.has(c.id))
        .map((c) => c.moduleId)
        .filter((id): id is string => Boolean(id)),
    );

    const scored = candidateCourses
      .filter((c) => !enrolledCourseIds.has(c.id) && !completedCourseIds.has(c.id))
      .map((course) => {
        let score = 0;
        for (const category of course.categories) {
          score += 3 * (preferredCategoryIds.get(category.id) ?? 0);
        }
        if (course.difficulty === dominantDifficulty) score += 1;
        if (course.difficulty === nextDifficulty) score += 2;
        if (course.moduleId && inProgressModuleIds.has(course.moduleId)) score += 1;

        const prerequisiteIds = course.prerequisites.map((p) => p.prerequisiteCourseId);
        const prerequisitesSatisfied = prerequisiteIds.every((id) => completedCourseIds.has(id));
        if (prerequisiteIds.length === 0 || prerequisitesSatisfied) score += 5;

        return { course, score };
      })
      .sort((a, b) => b.score - a.score || b.course._count.enrollments - a.course._count.enrollments);

    return scored.slice(0, RECOMMENDATION_LIMIT).map(({ course, score }) => this.toSummary(course, lang, score));
  }

  private rankByPopularity(courses: CandidateCourse[], lang: string) {
    return [...courses]
      .sort((a, b) => b._count.enrollments - a._count.enrollments)
      .map((course) => this.toSummary(course, lang));
  }

  private toSummary(course: CandidateCourse, lang: string, score?: number) {
    const translation =
      course.translations.find((t) => t.language.code === lang) ||
      course.translations.find((t) => t.language.code === 'es') ||
      course.translations[0];

    return {
      id: course.id,
      title: translation?.title ?? null,
      description: translation?.description ?? null,
      difficulty: course.difficulty,
      imageUrl: course.imageUrl,
      categories: course.categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
      score,
    };
  }
}
