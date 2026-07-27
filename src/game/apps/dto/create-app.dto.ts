import { AppType } from '@prisma/client';

export class CreateAppDto {
  type!: 'DELIVERY' | 'ECOMMERCE' | 'SOCIAL';
}
