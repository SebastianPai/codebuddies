import { IsString, MinLength } from 'class-validator';

export class CreateCodeStudioCompanyDto {
  @IsString()
  appTypeId!: string;

  @IsString()
  @MinLength(3)
  name!: string;
}
