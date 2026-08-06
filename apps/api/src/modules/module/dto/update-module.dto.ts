import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { CreateModuleTranslationDto } from './create-module.dto';

export class UpdateModuleDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModuleTranslationDto)
  translations?: CreateModuleTranslationDto[];
}
