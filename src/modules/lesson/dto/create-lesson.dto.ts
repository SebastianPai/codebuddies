import { LessonType } from '@prisma/client';

export class CreateLessonTranslationDto {
  languageCode: string; // 'es', 'en', etc.
  title: string;
  description?: string;
  content?: any; // JSON con el contenido traducido (markdown, bloques, etc.)
}

export class CreateLessonDto {
  courseId: string;
  order: number;
  type?: LessonType; // 'TEXT' | 'CODE' | 'QUIZ' | 'LIVE'
  translations: CreateLessonTranslationDto[];
}
