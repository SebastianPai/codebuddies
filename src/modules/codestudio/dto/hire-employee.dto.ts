import { IsString } from 'class-validator';

export class HireEmployeeDto {
  @IsString()
  employeeTypeId!: string;
}
