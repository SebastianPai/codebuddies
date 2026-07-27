import { BackgroundAccessType, Prisma } from '@prisma/client';

export class UpsertBackgroundDto {
  name!: string;
  description?: string;
  imageUrl!: string;
  previewUrl?: string;
  categoryId?: string | null;
  active?: boolean;
  sortOrder?: number;
  accessType?: BackgroundAccessType;
  isPremium?: boolean;
  isVip?: boolean;
  shopVisible?: boolean;
  coinsPrice?: number;
  gemsPrice?: number;
  metadata?: Prisma.InputJsonValue;
}
