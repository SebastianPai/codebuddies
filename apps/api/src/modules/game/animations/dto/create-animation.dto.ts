import {
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
} from 'class-validator';
import { AnimationType } from '@prisma/client';

export class CreateAnimationDto {
  @IsString()
  name: string;

  @IsEnum(AnimationType)
  type: AnimationType;

  @IsString()
  variant: string;

  @IsOptional()
  @IsBoolean()
  loop?: boolean;

  @IsOptional()
  @IsInt()
  speed?: number;
}
