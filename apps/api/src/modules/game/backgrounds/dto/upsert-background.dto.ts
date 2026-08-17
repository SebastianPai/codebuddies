import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BackgroundAccessType, Prisma } from '@prisma/client';

export class BackgroundTranslationDto {
  @IsString()
  languageCode: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpsertBackgroundDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BackgroundTranslationDto)
  translations: BackgroundTranslationDto[];

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
