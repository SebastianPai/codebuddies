import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ProjectSubmissionStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpsertCourseProjectDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(5000)
  instructions!: string;
}

export class SubmitProjectDto {
  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  submissionUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  submissionText?: string;
}

export class ReviewSubmissionDto {
  @IsEnum(ProjectSubmissionStatus)
  status!: ProjectSubmissionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
}
