import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class HireEmployeeDto {
  @IsString()
  employeeTypeId!: string;

  /** Candidato elegido (0 Junior, 1 Semi-senior, 2 Senior). Sin él, alguien al azar. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  candidateIndex?: number;
}
