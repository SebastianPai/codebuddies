import { IsIn, IsOptional, IsString } from 'class-validator';

export class InstallInfrastructureDto {
  @IsString()
  infrastructureTypeId!: string;

  /** Proveedor: budget (barato), standard o premium. Sin él, se mantiene el actual. */
  @IsOptional()
  @IsIn(['budget', 'standard', 'premium'])
  provider?: 'budget' | 'standard' | 'premium';
}
