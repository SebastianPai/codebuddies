import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
} from 'class-validator';
import {
  AvatarSlotType,
  FurnitureCategory,
  ItemAccessType,
  PlacementType,
  WorldItemKind,
} from '@prisma/client';

export class CreateItemDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  languageCode?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  layer?: number;

  @IsOptional()
  @IsInt()
  rarity?: number;

  @IsOptional()
  @IsInt()
  coinsPrice?: number;

  @IsOptional()
  @IsInt()
  gemsPrice?: number;

  @IsOptional()
  @IsBoolean()
  shopVisible?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ItemAccessType)
  accessType?: ItemAccessType;

  @IsOptional()
  @IsBoolean()
  colorable?: boolean;

  // Discriminador: si viene slot → es avatar item
  @IsOptional()
  @IsEnum(AvatarSlotType)
  slot?: AvatarSlotType;

  // Discriminador: si viene kind → es world item
  @IsOptional()
  @IsEnum(WorldItemKind)
  kind?: WorldItemKind;

  @IsOptional()
  @IsInt()
  width?: number;

  @IsOptional()
  @IsInt()
  height?: number;

  @IsOptional()
  @IsInt()
  footprintWidth?: number;

  @IsOptional()
  @IsInt()
  footprintHeight?: number;

  @IsOptional()
  @IsBoolean()
  isCollidable?: boolean;

  @IsOptional()
  @IsBoolean()
  walkable?: boolean;

  @IsOptional()
  @IsBoolean()
  isInteractable?: boolean;

  @IsOptional()
  @IsBoolean()
  rotatable?: boolean;

  @IsOptional()
  @IsEnum(PlacementType)
  placementType?: PlacementType;

  @IsOptional()
  @IsEnum(FurnitureCategory)
  furnitureCategory?: FurnitureCategory;

  @IsOptional()
  @IsBoolean()
  allowsStacking?: boolean;

  @IsOptional()
  @IsBoolean()
  canBeStacked?: boolean;

  @IsOptional()
  @IsInt()
  stackHeight?: number;

  @IsOptional()
  @IsInt()
  maxStackHeight?: number;

  @IsOptional()
  @IsInt()
  frameWidth?: number;

  @IsOptional()
  @IsInt()
  frameHeight?: number;

  @IsOptional()
  @IsInt()
  directions?: number;

  @IsOptional()
  @IsBoolean()
  syncDirections?: boolean;

  @IsOptional()
  @IsObject()
  footprints?: any;

  @IsOptional()
  @IsObject()
  surfaces?: any;
}
