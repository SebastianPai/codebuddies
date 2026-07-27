import { IsBoolean } from 'class-validator';

export class UpdateMarketingPreferencesDto {
  @IsBoolean()
  receiveMarketingEmails: boolean;
}
