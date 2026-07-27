import { Prisma } from '@prisma/client';

export class UpsertCatalogDto {
  name!: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  rarity?: string;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  metadata?: Prisma.InputJsonValue;
}
