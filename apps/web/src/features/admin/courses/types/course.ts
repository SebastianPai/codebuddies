import type { Translation } from "@/shared/ui";

export type CourseDifficulty = "EASY" | "MEDIUM" | "HARD";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface ModuleOption {
  id: string;
  title: string;
}

export interface CourseListItem {
  id: string;
  title: string;
  difficulty: string;
  status?: ContentStatus;
  lessons: unknown[];
  module?: { title: string };
}

export interface CoursePrerequisite {
  id: string;
  title: string | null;
}

export interface CourseDetails {
  id: string;
  moduleId: string;
  difficulty: CourseDifficulty;
  freeLimit: number;
  imageUrl?: string | null;
  status?: ContentStatus;
  translations: Translation[];
  prerequisites?: CoursePrerequisite[];
  categoryIds?: string[];
}

export interface CourseCategoryOption {
  id: string;
  slug: string;
  name: string;
}

export interface CourseFormValues {
  moduleId: string;
  difficulty: CourseDifficulty;
  freeLimit: number;
  status: ContentStatus;
  translations: Translation[];
  prerequisiteCourseIds: string[];
  categoryIds: string[];
}

export interface CourseTableRow {
  id: string;
  title: string;
  moduleTitle: string;
  difficulty: string;
  lessons: number;
}
