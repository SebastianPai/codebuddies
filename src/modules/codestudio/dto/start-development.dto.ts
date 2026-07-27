import { IsOptional, IsString } from 'class-validator';

export class StartDevelopmentDto {
  @IsString()
  moduleId!: string;

  @IsOptional()
  assignedEmployees?: string[];
}
