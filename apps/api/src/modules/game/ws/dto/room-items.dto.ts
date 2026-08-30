import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { InteractionType, WallSide } from '@prisma/client';

export class PlaceItemDto {
  @IsString()
  roomId!: string;

  @IsString()
  itemId!: string;

  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  rotation?: number;

  @IsOptional()
  @IsEnum(WallSide)
  wallSide?: WallSide;

  @IsOptional()
  @IsNumber()
  wallOffset?: number;
}

export class MoveItemDto {
  @IsString()
  roomItemId!: string;

  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  rotation?: number;
}

export class RotateItemDto {
  @IsString()
  roomItemId!: string;
}

export class RemoveItemDto {
  @IsString()
  roomItemId!: string;
}

export class InteractItemDto {
  @IsString()
  roomItemId!: string;

  @IsEnum(InteractionType)
  interaction!: InteractionType;
}

export class PaintSurfaceDto {
  @IsString()
  roomId!: string;

  @IsString()
  itemId!: string;

  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  height?: number;

  @IsOptional()
  @IsEnum(WallSide)
  wallSide?: WallSide;
}

// width/height acotan cuántas celdas puede pintar de una sola vez: antes no
// tenían límite y viajaban directo al bucle de paintAllSurface, que además
// confiaba en layoutJson.width/height sin autenticar (ver módulo de layouts).
export class PaintAllSurfaceDto {
  @IsString()
  roomId!: string;

  @IsString()
  itemId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  height?: number;
}

export class ClearRoomDto {
  @IsString()
  roomId!: string;
}
