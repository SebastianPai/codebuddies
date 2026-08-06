import { MissionCadence, MissionVisibility, Prisma } from '@prisma/client';

export class UpsertMissionDto {
  categoryId?: string | null;
  name!: string;
  description!: string;
  icon?: string;
  imageUrl?: string;
  cadence?: MissionCadence;
  condition!: string;
  requiredValue?: number;
  active?: boolean;
  visibility?: MissionVisibility;
  repeatable?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  sortOrder?: number;
  rewards?: Prisma.InputJsonValue;
  rewardBundleId?: string | null;
  notifyUsers?: boolean;
  dependencies?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}
