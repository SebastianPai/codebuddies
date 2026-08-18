import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CoinPurchaseStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListCoinPurchasesDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CoinPurchaseStatus)
  status?: CoinPurchaseStatus;

  @IsOptional()
  @IsString()
  userId?: string;
}
