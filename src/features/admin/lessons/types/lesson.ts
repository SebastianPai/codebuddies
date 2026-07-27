export type LessonType = "TEXT" | "CODE" | "QUIZ" | "LIVE";

export interface LessonTranslation {
  languageCode: string;
  title: string;
  description: string;
  content?: string;
}

interface LocalizedTitle {
  title: string;
  language: { code: string };
}

export interface CourseOption {
  id: string;
  title: string;
  module?: { title: string };
}

export interface LessonListItem {
  id: string;
  course?: {
    translations?: LocalizedTitle[];
    module?: { translations?: LocalizedTitle[] };
  };
  exercises?: unknown[];
  translations: LocalizedTitle[];
}

export interface LessonDetails {
  id: string;
  order: number;
  type: LessonType;
  experience: number;
  coins: number;
  translations: Array<{
    title: string;
    description?: string | null;
    language: { code: string };
    content?: { markdown?: string | null } | null;
  }>;
}

export interface LessonFormValues {
  courseId: string;
  order: number;
  type: LessonType;
  experience: number;
  coins: number;
  translations: LessonTranslation[];
}

export interface LessonTableRow {
  id: string;
  title: string;
  course: string;
  module: string | null;
  exercisesCount: number;
}
