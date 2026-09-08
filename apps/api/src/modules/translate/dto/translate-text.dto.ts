import { IsDefined, IsString, MaxLength, MinLength } from 'class-validator';

export class TranslateTextDto {
  // string suelto o array de strings — traducir un quiz / doc de bloques
  // entero en UNA request en vez de decenas (rate limit). El largo total y
  // el tipo de cada item se validan/clampan en TranslateService.
  @IsDefined()
  text!: string | string[];

  @IsString()
  @MinLength(2)
  @MaxLength(10)
  targetLang!: string;
}
