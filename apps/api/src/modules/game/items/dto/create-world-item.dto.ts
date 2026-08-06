import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateWorldItemDto {
  @IsString()
  itemId: string;

  @IsInt()
  width: number;

  @IsInt()
  height: number;

  @IsString()
  kind: string;

  @IsOptional()
  @IsBoolean()
  isCollidable?: boolean;

  @IsOptional()
  @IsBoolean()
  isInteractable?: boolean;
}
