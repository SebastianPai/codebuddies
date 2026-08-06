import { IsEnum, IsString } from 'class-validator';
import { AvatarSlotType } from '@prisma/client';

export class CreateAvatarItemDto {
  @IsString()
  itemId: string;

  @IsEnum(AvatarSlotType)
  slot: AvatarSlotType;
}
