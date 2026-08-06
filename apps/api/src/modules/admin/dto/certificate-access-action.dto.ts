import { CertificateAccessType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum CertificateAccessAction {
  GRANT = 'GRANT',
  SIMULATE_PAID = 'SIMULATE_PAID',
  REVOKE = 'REVOKE',
}

export class CertificateAccessActionDto {
  @IsString()
  userId: string;

  @IsString()
  courseId: string;

  @IsEnum(CertificateAccessAction)
  action: CertificateAccessAction;

  @IsOptional()
  @IsEnum(CertificateAccessType)
  accessType?: CertificateAccessType;
}
