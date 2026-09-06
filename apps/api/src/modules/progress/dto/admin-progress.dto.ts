import { IsIn, IsOptional, IsString } from 'class-validator';

// Payloads de las herramientas de test de admin (ver ProgressController).
export class AdminResetProgressDto {
  @IsIn(['lesson', 'course'])
  scope: 'lesson' | 'course';

  @IsString()
  @IsOptional()
  lessonId?: string;

  @IsString()
  @IsOptional()
  courseId?: string;
}

export class AdminCompleteCourseDto {
  @IsString()
  courseId: string;
}
