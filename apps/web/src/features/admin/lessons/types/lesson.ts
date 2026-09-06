export type LessonType = "TEXT" | "CODE" | "QUIZ" | "LIVE";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface LessonTranslation {
  languageCode: string;
  title: string;
  description: string;
  // Documento de bloques de teoría (LessonContentDoc). Se guarda como JSON y
  // el backend lo persiste tal cual en LessonTranslation.content (Json?).
  // `unknown` acá para casar con el <TranslationsForm> compartido; los
  // mappers normalizan/serializan en los bordes.
  content?: unknown;
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
  courseId?: string;
  order: number;
  type: LessonType;
  status?: ContentStatus;
  experience: number;
  coins: number;
  translations: Array<{
    title: string;
    description?: string | null;
    language: { code: string };
    // JSON crudo: doc de bloques nuevo, `{ markdown }` viejo, o null.
    content?: unknown;
  }>;
}

export interface LessonFormValues {
  courseId: string;
  order: number;
  type: LessonType;
  status: ContentStatus;
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
