import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CertificateOrderStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListCertificateOrdersDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CertificateOrderStatus)
  status?: CertificateOrderStatus;

  @IsOptional()
  @IsString()
  userId?: string;
}
