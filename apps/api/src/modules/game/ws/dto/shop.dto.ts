import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

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

  // Cuántas unidades comprar en esta misma operación (compra en lote). El
  // tope real de negocio es Item.maxStack, validado en ItemsService.buyItem
  // -- este @Max es solo un límite de sanidad del request en sí.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  quantity?: number;
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
