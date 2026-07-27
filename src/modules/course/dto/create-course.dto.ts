export class CreateCourseTranslationDto {
  languageCode: string; // es, en, zh-Hans
  title: string;
  description?: string;
}

export class CreateCourseDto {
  moduleId?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  freeLimit?: number;

  translations: CreateCourseTranslationDto[];
}
