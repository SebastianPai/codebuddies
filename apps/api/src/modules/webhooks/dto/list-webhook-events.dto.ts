import { IsEnum, IsOptional } from 'class-validator';
import { PaymentProviderType, WebhookEventStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListWebhookEventsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(WebhookEventStatus)
  status?: WebhookEventStatus;

  @IsOptional()
  @IsEnum(PaymentProviderType)
  provider?: PaymentProviderType;
}
