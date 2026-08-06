import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertCourseCategoryDto {
  @IsString()
  @MaxLength(100)
  slug!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
