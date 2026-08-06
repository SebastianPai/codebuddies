import { IsString } from 'class-validator';

export class BuildFavoriteDto {
  @IsString()
  itemId!: string;
}
