import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateModuleTranslationDto {
  @IsString()
  @MaxLength(10)
  languageCode: string; // 'es', 'en', 'zh-Hans', etc.

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // No usado por Module hoy, pero el formulario de admin compartido
  // (TranslationsForm) siempre lo envía — aceptarlo evita un 400 espurio.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;
}

export class CreateModuleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModuleTranslationDto)
  translations: CreateModuleTranslationDto[];
  // Si más adelante quieres agregar campos no traducibles (ej: slug, imageUrl, etc.), se ponen aquí
}
