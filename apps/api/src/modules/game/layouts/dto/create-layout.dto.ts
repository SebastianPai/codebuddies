import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateLayoutTranslationDto {
  @IsString()
  languageCode: string; // 'es', 'en-us', 'de', etc.

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateLayoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLayoutTranslationDto)
  translations: CreateLayoutTranslationDto[];

  @IsOptional()
  @IsString()
  previewImageUrl?: string;

  @IsNotEmpty()
  layoutJson: unknown;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tileSize?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
