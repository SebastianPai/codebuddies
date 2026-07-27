import { Currency } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCertificateOrderDto {
  @IsString()
  userId: string;

  @IsString()
  courseId: string;

  @IsString()
  @IsOptional()
  academyId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;
}
