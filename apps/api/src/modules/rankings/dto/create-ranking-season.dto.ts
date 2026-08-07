import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRankingSeasonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;
}
