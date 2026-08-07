import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFriendChallengeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  opponentUsername!: string;

  @IsString()
  courseId!: string;
}
