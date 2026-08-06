import { IsOptional, IsString } from 'class-validator';

export class IssueCertificateDto {
  @IsString()
  courseId: string;

  @IsString()
  @IsOptional()
  academyId?: string;
}
