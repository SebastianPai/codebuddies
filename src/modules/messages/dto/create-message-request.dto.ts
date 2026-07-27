import { IsString } from 'class-validator';

export class CreateMessageRequestDto {
  @IsString()
  username: string;

  @IsString()
  body: string;
}
