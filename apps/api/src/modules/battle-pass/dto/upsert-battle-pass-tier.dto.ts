import { BattlePassTrack, GamificationRewardType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertBattlePassTierDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  level?: number;

  @IsOptional()
  @IsEnum(BattlePassTrack)
  track?: BattlePassTrack;

  @IsOptional()
  @IsEnum(GamificationRewardType)
  rewardType?: GamificationRewardType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  amount?: number | null;

  // Item (objeto, mueble, ropa, efecto de nombre o burbuja de chat),
  // insignia o título según rewardType.
  @IsOptional()
  @IsString()
  itemId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
