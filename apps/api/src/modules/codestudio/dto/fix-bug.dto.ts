import { IsIn, IsOptional, IsString } from 'class-validator';

export class FixBugDto {
  @IsIn(['cash', 'employee'])
  method!: 'cash' | 'employee';

  @IsOptional()
  @IsString()
  employeeId?: string;
}
