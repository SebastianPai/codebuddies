import { IsString, MaxLength, MinLength } from 'class-validator';

export class TranslateTextDto {
  @IsString()
  @MaxLength(20_000)
  text!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(10)
  targetLang!: string;
}
