import { IsNumber } from 'class-validator';

export class SetPricingDto {
  // Uno de PRICE_LEVELS (content/events.ts): 0.6, 0.8, 1, 1.3, 1.6.
  @IsNumber()
  level!: number;
}
