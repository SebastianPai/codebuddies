import { SubscriptionProviderType } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreatePremiumSubscriptionDto {
  @IsString()
  userId: string;

  @IsEnum(SubscriptionProviderType)
  @IsOptional()
  provider?: SubscriptionProviderType;

  @IsString()
  @IsOptional()
  providerSubscriptionId?: string;

  @IsISO8601()
  expiresAt: string;
}
