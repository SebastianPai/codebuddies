import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { PremiumOrigin, PremiumSubscriptionStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListPremiumSubscriptionsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PremiumSubscriptionStatus)
  status?: PremiumSubscriptionStatus;

  @IsOptional()
  @IsEnum(PremiumOrigin)
  origin?: PremiumOrigin;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  expiringSoon?: boolean;
}
