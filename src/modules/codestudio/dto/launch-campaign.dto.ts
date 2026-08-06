import { IsString } from 'class-validator';

export class LaunchCampaignDto {
  @IsString()
  campaignId!: string;
}
