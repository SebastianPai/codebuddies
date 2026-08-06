import { IsOptional, IsString } from 'class-validator';

export class GetItemSpritesDto {
  @IsString()
  itemId!: string;

  @IsOptional()
  @IsString()
  animationId?: string;
}
