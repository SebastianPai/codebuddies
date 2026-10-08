import { BattlePassProgressMode, BattlePassSeasonStatus } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Antes estos DTOs no tenían decoradores: con el ValidationPipe global
// (whitelist + forbidNonWhitelisted) toda edición desde el admin se
// rechazaba por "property should not exist".
export class UpsertBattlePassSeasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  seasonNumber?: number;

  @IsOptional()
  @IsEnum(BattlePassSeasonStatus)
  status?: BattlePassSeasonStatus;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  totalLevels?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  xpPerLevel?: number;

  @IsOptional()
  @IsEnum(BattlePassProgressMode)
  progressMode?: BattlePassProgressMode;
}

// Temporada de un mes calendario: del día 1 (00:00) al último día del mes
// (23:59:59, hora de Colombia), con un día de premios por cada día del mes.
export class CreateMonthlySeasonDto {
  @IsInt()
  @Min(2024)
  @Max(2100)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // Temporada de la que se copian los premios (por día). Sin esto se crea
  // vacía.
  @IsOptional()
  @IsString()
  copyTiersFromSeasonId?: string;

  // Activarla ya (si el mes es el actual) en vez de dejarla programada.
  @IsOptional()
  @IsBoolean()
  activateNow?: boolean;
}
