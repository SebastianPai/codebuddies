import { IsString } from 'class-validator';

export class InstallInfrastructureDto {
  @IsString()
  infrastructureTypeId!: string;
}
