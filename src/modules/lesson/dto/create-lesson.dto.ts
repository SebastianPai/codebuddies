import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ContentStatus, LessonType } from '@prisma/client';
import { MaxJsonSize } from '../../../common/validators/max-json-size.validator';

const MAX_CONTENT_BYTES = 300_000; // ~300KB — generoso para markdown/bloques, corta payloads abusivos

export class CreateLessonTranslationDto {
  @IsString()
  @MaxLength(10)
  languageCode: string; // 'es', 'en', etc.

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @MaxJsonSize(MAX_CONTENT_BYTES)
  content?: unknown; // JSON con el contenido traducido (markdown, bloques, etc.)
}

export class CreateLessonDto {
  @IsString()
  courseId: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsOptional()
  @IsEnum(LessonType)
  type?: LessonType; // 'TEXT' | 'CODE' | 'QUIZ' | 'LIVE'

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  experience?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  coins?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLessonTranslationDto)
  translations: CreateLessonTranslationDto[];
}
