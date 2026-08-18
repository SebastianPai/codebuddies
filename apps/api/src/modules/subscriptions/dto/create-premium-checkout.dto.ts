import { IsIn } from 'class-validator';
import type { BillingInterval } from '../types/subscription-provider.types';

export class CreatePremiumCheckoutDto {
  @IsIn(['monthly', 'yearly'])
  billingInterval!: BillingInterval;
}
