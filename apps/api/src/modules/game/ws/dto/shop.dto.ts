import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

const SHOP_SORTS = ['new', 'old', 'cheap', 'expensive', 'popular'] as const;

export class ShopItemsRequestDto {
  @IsOptional()
  @IsIn(SHOP_SORTS)
  sort?: (typeof SHOP_SORTS)[number];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;
}

export class BuyItemDto {
  @IsString()
  itemId!: string;
}

export class BuyBackgroundDto {
  @IsString()
  backgroundId!: string;
}

export class GiftItemDto {
  @IsString()
  itemId!: string;

  @IsString()
  recipientUsername!: string;
}
