import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SubmitCodeAnswerDto {
  @IsString()
  @MaxLength(50_000)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  lang?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86_400)
  timeSpentSeconds?: number;
}
