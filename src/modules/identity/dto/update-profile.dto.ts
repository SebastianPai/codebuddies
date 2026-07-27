import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  country?: string;
}
