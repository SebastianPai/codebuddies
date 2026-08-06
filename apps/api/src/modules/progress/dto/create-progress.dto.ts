import { IsInt, IsString, IsOptional, Max, Min } from 'class-validator';

export class CreateProgressDto {
  @IsString()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  lessonId?: string;

  @IsString()
  @IsOptional()
  exerciseId?: string;

  // DB7: solo los llena internamente exercise.service.ts al reenviar hacia
  // ProgressService tras validar un quiz/código server-side — no se exponen
  // como algo que el cliente pueda declarar directamente en POST /progress.
  @IsInt()
  @IsOptional()
  @Min(1)
  attempts?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  score?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(86_400)
  timeSpentSeconds?: number;
}
