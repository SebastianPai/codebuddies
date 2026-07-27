import { ExerciseType } from '@prisma/client';

export class CreateExerciseTranslationDto {
  languageCode: string; // 'es', 'en', 'zh-Hans', etc.
  title: string;
  description?: string;
  content?: any; // JSON con el contenido traducido (instrucciones, etc.)
}

export class CreateExerciseDto {
  lessonId: string;
  type: ExerciseType;
  codes?: Array<{
    language: string;
    initialCode: string;
    expectedCode?: string;
  }>;
  experience?: number;
  coins?: number;
  order?: number; // opcional, si no se pasa se calcula automáticamente

  translations: CreateExerciseTranslationDto[];
}
