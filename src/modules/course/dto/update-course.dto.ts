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
import { CreateCourseTranslationDto } from './create-course.dto';

export class UpdateCourseDto {
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCourseTranslationDto)
  translations?: CreateCourseTranslationDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisiteCourseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];
}
