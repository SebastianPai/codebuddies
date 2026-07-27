import { Prisma } from '@prisma/client';

export class UpsertRewardBundleDto {
  name!: string;
  description?: string;
  rewards!: Prisma.InputJsonValue;
  active?: boolean;
}
