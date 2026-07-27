import type { Translation } from "@/shared/ui";

export type CourseDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface ModuleOption {
  id: string;
  title: string;
}

export interface CourseListItem {
  id: string;
  title: string;
  difficulty: string;
  lessons: unknown[];
  module?: { title: string };
}

export interface CourseDetails {
  id: string;
  moduleId: string;
  difficulty: CourseDifficulty;
  freeLimit: number;
  imageUrl?: string | null;
  translations: Translation[];
}

export interface CourseFormValues {
  moduleId: string;
  difficulty: CourseDifficulty;
  freeLimit: number;
  translations: Translation[];
}

export interface CourseTableRow {
  id: string;
  title: string;
  moduleTitle: string;
  difficulty: string;
  lessons: number;
}
