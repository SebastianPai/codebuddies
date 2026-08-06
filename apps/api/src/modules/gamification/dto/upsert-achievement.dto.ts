import { Prisma } from '@prisma/client';

export class UpsertAchievementDto {
  name!: string;
  description!: string;
  icon?: string;
  imageUrl?: string;
  condition!: string;
  requiredValue?: number;
  visible?: boolean;
  sortOrder?: number;
  rewards?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}
