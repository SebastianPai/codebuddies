import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ContentStatus, ExerciseType } from '@prisma/client';
import {
  CreateExerciseTranslationDto,
  ExerciseCodeDto,
} from './create-exercise.dto';

export class UpdateExerciseDto {
  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsEnum(ExerciseType)
  type?: ExerciseType;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseCodeDto)
  codes?: ExerciseCodeDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  experience?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  coins?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseTranslationDto)
  translations?: CreateExerciseTranslationDto[];
}
