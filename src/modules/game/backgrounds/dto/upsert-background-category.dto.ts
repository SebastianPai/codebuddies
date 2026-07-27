import { Prisma } from '@prisma/client';

export class UpsertBackgroundCategoryDto {
  name!: string;
  slug?: string;
  description?: string;
  active?: boolean;
  sortOrder?: number;
  metadata?: Prisma.InputJsonValue;
}
