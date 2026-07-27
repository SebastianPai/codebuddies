import { Difficulty } from '@prisma/client';

export class UpdateCourseDto {
  moduleId?: string;
  difficulty?: Difficulty;
  freeLimit?: number;
  imageUrl?: string;

  translations?: {
    languageCode: string;
    title: string;
    description?: string;
  }[];
}
