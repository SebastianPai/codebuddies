import { IsString, MaxLength } from 'class-validator';

export class CreateOfficeDto {
  @IsString()
  @MaxLength(64)
  layoutId!: string;
}
