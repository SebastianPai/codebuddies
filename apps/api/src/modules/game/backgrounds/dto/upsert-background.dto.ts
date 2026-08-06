import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { BackgroundAccessType, Prisma } from '@prisma/client';

export class UpsertBackgroundDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  previewUrl?: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsEnum(BackgroundAccessType)
  accessType?: BackgroundAccessType;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsBoolean()
  isVip?: boolean;

  @IsOptional()
  @IsBoolean()
  shopVisible?: boolean;

  @IsOptional()
  @IsInt()
  coinsPrice?: number;

  @IsOptional()
  @IsInt()
  gemsPrice?: number;

  @IsOptional()
  @IsObject()
  metadata?: Prisma.InputJsonValue;
}
