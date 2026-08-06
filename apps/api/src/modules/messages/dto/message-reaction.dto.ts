import { IsString, MaxLength } from 'class-validator';

export class MessageReactionDto {
  @IsString()
  @MaxLength(12)
  emoji: string;
}
