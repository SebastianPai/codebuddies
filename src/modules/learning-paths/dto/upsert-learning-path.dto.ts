import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class LearningPathTranslationDto {
  @IsString()
  @MaxLength(10)
  languageCode!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpsertLearningPathDto {
  @IsString()
  @MaxLength(100)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningPathTranslationDto)
  translations!: LearningPathTranslationDto[];
}

export class SetPathCoursesDto {
  @IsArray()
  @IsString({ each: true })
  courseIds!: string[];
}
