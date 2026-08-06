import { IsString, IsInt, IsEnum, IsOptional } from 'class-validator';
import { Direction } from '@prisma/client';

export class CreateItemSpriteDto {
  @IsString()
  itemId: string;

  @IsString()
  animationId: string;

  @IsEnum(Direction)
  direction: Direction;

  @IsString()
  imageUrl: string;

  @IsInt()
  frameWidth: number;

  @IsInt()
  frameHeight: number;

  @IsInt()
  framesCount: number;

  @IsOptional()
  @IsInt()
  row?: number;
}
