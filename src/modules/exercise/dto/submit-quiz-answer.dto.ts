import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubmitQuizAnswerDto {
  @IsInt()
  @Min(0)
  questionIndex: number;

  @IsArray()
  @IsInt({ each: true })
  selectedOptions: number[];

  @IsString()
  @IsOptional()
  lang?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86_400)
  timeSpentSeconds?: number;
}
