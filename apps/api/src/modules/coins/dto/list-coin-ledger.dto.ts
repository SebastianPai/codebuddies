import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListCoinLedgerDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;
}
