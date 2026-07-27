import { IsString, IsOptional } from 'class-validator';

export class CreateProgressDto {
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  lessonId?: string;

  @IsString()
  @IsOptional()
  exerciseId?: string;
}
