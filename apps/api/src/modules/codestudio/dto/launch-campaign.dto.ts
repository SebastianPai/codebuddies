import { IsIn, IsOptional, IsString } from 'class-validator';

export class LaunchCampaignDto {
  @IsString()
  campaignId!: string;

  // Presupuesto: x1, x3 o x10 del costo base del canal.
  @IsOptional()
  @IsIn([1, 3, 10])
  multiplier?: number;
}
