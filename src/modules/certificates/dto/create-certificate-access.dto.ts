import { CertificateAccessType } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateCertificateAccessDto {
  @IsString()
  userId: string;

  @IsString()
  courseId: string;

  @IsString()
  @IsOptional()
  academyId?: string;

  @IsEnum(CertificateAccessType)
  accessType: CertificateAccessType;

  @IsISO8601()
  @IsOptional()
  expiresAt?: string;
}
