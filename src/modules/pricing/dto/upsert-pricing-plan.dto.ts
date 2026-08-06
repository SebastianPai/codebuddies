import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PricingBillingInterval } from '@prisma/client';

export class LocalizedTextDto {
  @IsString()
  @MaxLength(300)
  es!: string;

  @IsString()
  @MaxLength(300)
  en!: string;

  @IsString()
  @MaxLength(300)
  zh!: string;
}

export class UpsertPricingPlanDto {
  @IsString()
  @MaxLength(60)
  key!: string;

  @IsNumber()
  @Min(0)
  priceUsd!: number;

  @IsOptional()
  @IsEnum(PricingBillingInterval)
  billingInterval?: PricingBillingInterval;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsString()
  @MaxLength(300)
  ctaHref!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name!: LocalizedTextDto;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  ctaLabel!: LocalizedTextDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  features!: LocalizedTextDto[];
}
