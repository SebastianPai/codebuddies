import { IsOptional, IsString } from 'class-validator';

export class PurchaseCertificateDto {
  @IsString()
  courseId: string;

  @IsOptional()
  @IsString()
  academyId?: string;
}
