import { IsString, MaxLength } from 'class-validator';

export class ChooseDecisionDto {
  @IsString()
  @MaxLength(40)
  choice!: string;
}
