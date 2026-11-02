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
import { ContentStatus, Difficulty } from '@prisma/client';

export class CreateCourseTranslationDto {
  @IsString()
  @MaxLength(10)
  languageCode: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // No usado por Course hoy (no tiene columna de contenido propio), pero el
  // formulario de admin compartido (TranslationsForm) siempre lo envía —
  // aceptarlo evita un 400 espurio por forbidNonWhitelisted.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;
}

export class CreateCourseDto {
  @IsOptional()
  @IsString()
  moduleId?: string;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  freeLimit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCourseTranslationDto)
  translations: CreateCourseTranslationDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisiteCourseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];
}
