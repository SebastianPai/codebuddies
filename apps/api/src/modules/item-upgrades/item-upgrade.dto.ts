import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateItemUpgradeDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_-]{1,39}$/, {
    message: 'La clave debe ser minúsculas, números, "_" o "-" (ej. encendido).',
  })
  key: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(100_000)
  priceCoins: number;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  unlockStates: string[];

  @IsOptional()
  @IsString()
  requiresId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateItemUpgradeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  priceCoins?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  unlockStates?: string[];

  @IsOptional()
  @IsString()
  requiresId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
