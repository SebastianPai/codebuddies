import { IsUUID } from 'class-validator';

export class CreateFriendRequestDto {
  @IsUUID()
  userId!: string;
}
