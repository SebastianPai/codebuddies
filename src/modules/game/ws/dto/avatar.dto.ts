import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export interface ParsedSlot {
  slot: string;
  itemId: string | null;
  imageUrl?: string | null;
  layer?: number;
  color?: number | null;
  colorable?: boolean;
  sprites: Array<{
    imageUrl: string;
    frameWidth: number;
    frameHeight: number;
    framesCount: number;
    rows: number;
    animation: {
      speed: number;
      loop: boolean;
    };
  }>;
}

export interface ParsedAvatar {
  slots: ParsedSlot[];
  skinColor: number;
}

// ====================== DTOs para requests (con validación real) ======================

export class EquipItemDto {
  @IsString()
  slot!: string;

  // string para equipar, null/undefined para desequipar (equivalente a "0").
  @IsOptional()
  @IsString()
  itemId?: string | null;

  @IsOptional()
  @IsNumber()
  color?: number | null;
}

export class AvatarSlotEntryDto {
  @IsString()
  slot!: string;

  @IsOptional()
  @IsString()
  itemId?: string | null;

  @IsOptional()
  @IsNumber()
  color?: number | null;
}

export class UpdateAvatarDto {
  @IsOptional()
  @IsNumber()
  skinColor?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvatarSlotEntryDto)
  slots?: AvatarSlotEntryDto[];
}

export interface AvatarResponse {
  avatar: ParsedAvatar;
  playerId?: string;
}
